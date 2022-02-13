const puppeteer = require('puppeteer')
const lib = require('./libs.js')
const Objects = require('./objects.js')
const browser_wrapper=require('../metamask-airdrop-libs/wrappers')
const waitForSelectorDisappear=require('../metamask-airdrop-libs/wrappers').waitForSelectorDisappear

/**
 * MetaMask包装器
 * 处理登录，批准，转账，账户信息输入等全系列操作
 */
class MetaMaskWrapper{
    /**
     * 
     * @param {puppeteer.Page} pageInstance 
     */
    constructor(pageInstance) {
        if (Objects.isClassOf(pageInstance, "PageWrapper")) {
            /**
             * @param this.page: browser_wrapper.PageWrapper
             */
            this.page = pageInstance
        } else if (Objects.isClassOf(pageInstance, "Page")) {
            this.page = new browser_wrapper.PageWrapper(pageInstance)
        } else {
            throw new Error("创建MetaMask时发现传入的Page对象非Page/PageWrapper实例")
        }
    }

    /**
     * 自动登录
     * @returns {Promise<lib.Result>}
     */
    async clickLogin(password) {
        const inputSelector='input.MuiInputBase-input.MuiInput-input'
        /**
         * 如果页面上找不到输入框就刷新页面1次
         */
        await Promise.resolve().then(() => {
            return new Promise(async (resolve, reject) => {
                await this.page.waitForSelector(inputSelector, {timeout:3000, visible: false}).catch(reject).then(resolve)
            })
        }).then(() => {
            return new Promise(async (resolve, reject) => {
                await this.page.reload()
                resolve()
            })
        }).catch(e => {
            console.error(`有错误发生1：${e}`)
        })

        /**
         * 获取界面上的输入框，自动输入密码
         */
        await this.page.waitForSelector(inputSelector, { timeout: 5000, visible: true }).then(async (ele) => {
            return new Promise(async (resolve, reject) => {
                console.log(`填充密码 ${password}`)
                await ele.type(password).then(resolve).catch(reject)
            })
        }).catch((e) => {
            return Promise.reject(`没有找到元素${inputSelector}`)
        }).then(async () => {
            //document.querySelector('#loading__spinner')
            /**
             * 等待菊花消失，不然会出现点击了按钮结果无效的情况
             */
            return new Promise((resolve, reject) => {
                const spinnerSelector='#loading__spinner'
                this.page.querySelectorFirst(spinnerSelector, {timeout: 10000, hidden: true}).then(resolve).catch(reject)
            })
        }).then(async() => {
            /**
             * 点击解锁按钮
             */
            const buttonSelector='button.button.btn--rounded.btn-default'
            let ret = await this.page.querySelectorFirst(buttonSelector, { visible: true, timeout: 30000 }).then(async (ele) => {
                await lib.sleep(1000)
                return new Promise(async (resolve, reject) => {
                    await ele.click().then((element) => {
                        console.log("按下解锁按钮")
                        resolve()
                    }).catch(Promise.reject) //点击按钮
                })
            }).catch((e) => {
                return lib.Result.error(e)
            }).then(() => {
                return lib.Result.succ()
            })
            return ret
        })
    }

    /**
     * 点击主要按钮
     * @returns {Promise<lib.Result>}
     */
    async clickBtnPrimary() {
        let ret = await this.page.querySelectorFirst("button.btn-primary", { visible: true, timeout: 10000 }).then(async (ele) => {
            await ele.click() //点击按钮
            return Promise.resolve()
        }).catch((e) => {
            return lib.Result.error("未能在MetaMask界面上找到主要按钮")
        }).then(() => {
            return lib.Result.succ()
        })
        return ret
    }

    /**
     * 点击次要按钮
     * @returns {Promise<lib.Result>}
     */
    async clickBtnSecondary() {
        let ret = await this.page.querySelectorFirst("button.btn-secondary", { visible: true, timeout: 10000 }).then(async (ele) => {
            await ele.click() //点击按钮
            return Promise.resolve()
        }).catch((e) => {
            return lib.Result.error("未能在MetaMask界面上找到次要按钮")
        }).then(() => {
            return lib.Result.succ()
        })
        return ret
    }

    /**
     * 获取当前账户名
     * @returns {Promise<lib.Result>}
     */
    async getCurrentAccountName() {
        let ret=await this.page.waitForSelector('div.selected-account__name', { timeout: 1000, visible: true }).then(async (ele) => {
            let val = await (await ele.getProperty('textContent')).jsonValue()
            return Promise.resolve(val)
        }).catch((e) => {
            return lib.Result.error(`没有找到账户名元素 ${e}`)
        }).then((val) => {
            return lib.Result.succ(val)
        })
        return ret
    }

    /**
     * 获取当前账户省略（带星）
     * @returns {Promise<lib.Result>}
     */
    async getCurrentAccountEllipsis() {
        let ret=await this.page.waitForSelector('.selected-account__address', { timeout: 1000, visible: true }).then(async (ele) => {
            let val = await (await ele.getProperty('textContent')).jsonValue()
            return Promise.resolve(val)
        }).catch((e) => {
            return lib.Result.error(`未找到当前账户省略地址 ${e}`)
        }).then((val) => {
            return lib.Result.succ(val)
        })
        return ret
    }

    /**
     * 获取当前余额
     * @returns {Promise<number>}
     */
    async getBalanceValue() {
        let ret = await this.page.waitForSelector('.currency-display-component__text').then(async (ele) => {
            let ret = await (await ele.getProperty('textContent')).jsonValue()
            return parseFloat(new String(ret).toString())
        }).catch(e => {
            return -1
        })
        return ret
    }

    /**
     * 设置超时时间
     * @param {number} timeout 
     * @return {Promise<Void>}
     */
    async setDefaultNavigationTimeout(timeout) {
        await this.page.setDefaultNavigationTimeout(timeout)
    }

    /**
     * @returns {Promise<void>}
     */
    async bringToFront() {
        return await this.page.bringToFront()
    }

    /**
     * 切换账户，在我的账户中找一个余额最大的并切换
     * @param {string} currentAccountText 当前账户的名字
     * @returns {Promise<lib.Result>}
     */
    async changeProfile(currentAccountText) {
        /**
         * 找到我的账户元素
         */
        let ele=await this.page.waitForSelector('div.identicon', {
            visible: true,
            timeout: 2000
        })
        if (Objects.isNull(ele)) {
            return lib.Result.error('没有找到我的账户')
        }
        await ele.click()
        lib.sleep(200)

        //let accountName=await (await eleAccountName.getProperty('textContent')).jsonValue()

        /**
         * 找出下拉的所有账户元素，找出所有非当前账户的所有元素并加入到一个新的节点列表里
         */
        let nlist = await this.page.querySelectorAll('div.account-menu__account-info')
        if (Objects.isNull(nlist) || nlist.length == 0) {
            return lib.Result.error('没有在我的账户的下拉框里找到账户')
        }

        /**
         * 过滤掉当前账户并对节点列表倒排序
         */
        let nvList = []
        for (let i = 0; i <= nlist.length - 1; i++) {
            let o=nlist[i]
            let elAccountMenuName = await o.$('.account-menu__name')
            if (Objects.isNull(elAccountMenuName)) {
                continue
            }
            let elAccountDisplayComponentText = await o.$('.currency-display-component__text')
            if (Objects.isNull(elAccountDisplayComponentText)) {
                continue
            }
            let name = await (await elAccountMenuName.getProperty('textContent')).jsonValue()
            let val=await (await elAccountDisplayComponentText.getProperty('textContent')).jsonValue()

            if (name !== currentAccountText) {
                nvList.push({
                    n: name,
                    v:val
                })
            }
        }
        let nvList1 = nvList.sort( (o1, o2) => {
            return parseFloat(o1.v) - parseFloat(o2.v) > 0? -1:1
        })

        if (nvList1.length == 0) {
            return lib.Result.error(`未能找到除了${currentAccountText}之外的账户，无法自动选择`)
        }
        /**
         * 获取金额最大的账户
         */
        for (let i = 0; i <= nlist.length - 1; i++){
            let o=nlist[i]
            let elAccountMenuName = await o.$('.account-menu__name')
            if (Objects.isNull(elAccountMenuName)) {
                continue
            }
            let elAccountDisplayComponentText = await o.$('.currency-display-component__text')
            if (Objects.isNull(elAccountDisplayComponentText)) {
                continue
            }
            let name = await (await elAccountMenuName.getProperty('textContent')).jsonValue()
            let ret = name === nvList1[0].n
            if (ret) {
                await o.click() //点击最适合的账户
                return lib.Result.succ()
            }

        }
        return lib.Result.succ()
    }

    /**
     * 自动登录
     * @returns {Promise<lib.Result>}
     */
    async login(password) {
        let ele=await this.page.waitForSelector('input.MuiInputBase-input.MuiInput-input', {
            visible: true,
            timeout: 10000
        })
        if (Objects.isNull(ele)){
            return lib.Result.error("没有找到登录页面输入框！")
        }
        await ele.type(password)
        //await this.page.type('input.MuiInputBase-input.MuiInput-input', password)
        await this.page.click('button.button.btn--rounded.btn-default')
        await this.page.waitForNavigation()
        return lib.Result.succ()
    }

    /*
    * 发送按钮
    * @returns {Promise<lib.Result>}
    */
    async sendActions() {
        let el = await this.page.waitForSelector('.icon-button.eth-overview__button[data-testid=eth-overview-send]', {
            visible: true,
            timeout: 2000
        });
        if (Objects.isNull(el)) {
            return lib.Result.error('没有找到发送按钮')
        }
        await el.click();//点击发送按钮
        return lib.Result.succ()
    }

    /**
     * 输入钱包地址
     * @param {string} addr 
     * @returns {Promise<lib.Result>}
     */
    async typeAddress(addr) {
        let el=await this.page.waitForSelector('input.ens-input__wrapper__input', {
            visible: true,
            timeout: 2000
        });
        if (Objects.isNull(el)) {
            return lib.Result.error('没有找到地址输入框')
        }
        await el.focus()
        await el.type(new String(addr).toString());
        //await this.page.type('input.ens-input__wrapper__input', addr)
        return lib.Result.succ()
    }

    /**
     * 设置转账金额
     * @param {number} amount
     * @returns {Promise<lib.Result>}
    */
    async setAmountAccounts(amount) {
        let el = await this.page.waitForSelector('.unit-input__input-container>input[type=number]', {
            visible: true,
            timeout: 2000
        }) //转账金额
        if (Objects.isNull(el)) {
            return lib.Result.error('转账金额没有找到')
        }
        await el.focus()
        //await el.click()
        await el.type(new String(amount).toString())
        await this.page.waitForTimeout(300)
        return lib.Result.succ()
    }

    /**
     *  设置gas费
     * @pram {string} val
     * @returns {Promise<lib.Result>}
     */
    async setGasAccounts(val) {
        let el = await this.page.waitForSelector('.advanced-gas-inputs__gas-edit-row__input[data-testid=gas-price]', {
            visible: true,
            timeout: 2000
        }) //gas费
        if (Objects.isNull(el)) {
            return lib.Result.error('gas fee 没有找到')
        }
        await el.focus()
        await el.type(val)
        await this.page.waitForTimeout(300)
        return lib.Result.succ()
    }

    /**
     * 设置gas限制
     * @param {*} val 
     * @returns {Promise<lib.Result>}
     */
    async setGasLimit(val) {
        let el = await this.page.waitForSelector('.advanced-gas-inputs__gas-edit-row__input[data-testid=gas-limit]', {
            visible: true,
            timeout: 2000
        }) //gas限制
        if (Objects.isNull(el)) {
            return lib.Result.error('gas limit 没有找到')
        }
        await el.focus()
        await el.type(new String(val).toString())
        await this.page.waitForTimeout(300)
        return lib.Result.succ()
    }

    /**
    * 点击下一步
    * @returns {Promise<lib.Result>}
    * fixme: 尝试使用 clickBtnPrimary
    */
    async clickNextButton() {
        let el = await this.page.waitForSelector('.button.btn--rounded.btn-primary.page-container__footer-button:enabled', {
            visible: true,
            timeout: 60000
        })
        if (Objects.isNull(el)) {
            return lib.Result.error('可用的下一步按钮没有找到')
        }
        await el.focus()
        await this.page.waitForTimeout(300)
        await el.click() //点击下一步
        return lib.Result.succ()
    }

    /**
     * 确认转账按钮
     * @returns {Promise<lib.Result>}
     * fixme: 尝试使用 clickBtnPrimary
     * */
    async clickConfirmButtonAccounts() {
        let el = await this.page.waitForSelector('.button.btn--rounded.btn-primary.page-container__footer-button', {
            visible: true,
            timeout: 2000
        })//确认转账按钮
        if (Objects.isNull(el)) {
            console.warn("未能找到确认按钮")
            // eslint-disable-next-line no-unused-vars
            return new Promise((t1, t2) => { })
        }
        await el.focus()
        await el.click()//点击下一步
        await this.page.waitForTimeout(300)
        return lib.Result.succ()
    }

    /**
     * 转向到首页
     * @returns {Promise<lib.Result>}
     * */
    async goHomeActions() {
        await this.page.evaluate(async () => {
            /*查找右上角的取消按钮并点击*/
            let ele = document.querySelector('.button.btn-link.page-container__header-close-text');
            if (typeof ele !== 'undefined' && ele !== null) {
                await ele.click()
                return null
            }
            /*查找左下角的取消按钮*/
            let ele1 = document.querySelector('.button.btn--rounded.btn-secondary.page-container__footer-button[data-testid=page-container-footer-cancel]')
            if (typeof ele1 !== 'undefined' && ele1 !== null) {
                await ele1.click()
                return null
            }

            /*查找左下角的拒绝按钮*/
            let ele2 = document.querySelector('.button.btn--rounded.btn-secondary.page-container__footer-button[data-testid=page-container-footer-cancel]')
            if (typeof ele2 !== 'undefined' && ele2 !== null) {
                await ele2.click()
                return null
            }
            /*查找左下角的拒绝按钮*/
            let ele3 = document.querySelector('.button.btn--rounded.btn-secondary.page-container__footer-button[data-testid=page-container-footer-cancel]')
            if (typeof ele3 !== 'undefined' && ele3 !== null) {
                await ele3.click()
                return null
            }
        }, {});
        return lib.Result.succ("当前已经是首页了")
    }
}

/**
 * Metamask弹出对话框
 */
class MetamaskPopuper{
    constructor(browser) {
        this.browser=browser
        this.primaryButtonQuerySelector = null
        this.timeout = 5000
        this.asyncBeforeOpenFunc = null
        this.asyncAfterOpenFunc=null
    }

    /**
     * 获取metamask的主要按钮选择器
     * @returns {browser_wrapper.QuerySelector}
     */
    getPrimaryButtonSelector() {
        return this.primaryButtonQuerySelector
    }

    /**
     * 设置metamask的主要按钮选择器
     * @param {*} selectorType 选择类型
     * @param {*} selector 选择器表达式
     * @returns {MetamaskPopuper}
     */
    setPrimaryButtonSelector(selectorType, selector) {
        this.primaryButtonQuerySelector = new browser_wrapper.QuerySelector(selectorType, selector)
        return this
    }

    /**
     * 获取异步的弹出窗口前触发的函数
     * @returns {()=>{}}
     */
    getAsyncBeforeOpenFunc() {
        return this.asyncBeforeOpenFunc
    }

    /**
     * 设置异步的弹出窗口前触发的函数
     * @param {()=>{}} func 
     * @returns {MetamaskPopuper}
     */
    setAsyncBeforeOpenFunc(func) {
        this.asyncBeforeOpenFunc = func
        return this
    }
    
    /**
     * 获取异步的弹出窗口后触发的函数
     * @returns {(pop)={}}
     */
    getAsyncAfterOpenFunc() {
        return this.asyncAfterOpenFunc
    }
    
    /**
     * 设置异步的弹出窗口后触发的函数
     * @param {(pop)=>{}} func 
     * @returns {MetamaskPopuper}
     */
    setAsyncAfterOpenFunc(func) {
        this.asyncAfterOpenFunc = func
        return this
    }
    
    /**
     * 设置超时时间
     * @param {number} timeout 
     * @returns {MetamaskPopuper}
     */
    setTimeout(timeout) {
        this.timeout = timeout
        return this
    }

    // /**
    //  * 弹出 targetcreated 模式对话框
    //  * @returns {Promise<lib.Result>}
    //  */
    // async popupTargetcreated() {
    //     const popupPromiser = new Promise(resolve => this.browser.once('targetcreated', target => {
    //         let p2 = target.page()
    //         // let text = p2.content()
    //         // if (text.trim() === "") {//防止弹出对话框不显示内容，这里强制刷新一下
    //         //     p2.reload()
    //         // }
    //         resolve(p2)
    //     }))
    //     if (Objects.nonNull(this.asyncBeforeOpenFunc)) {
    //         await this.asyncBeforeOpenFunc()
    //         await lib.sleep(1000)
    //     }
    //     //await ele.click() //点击菜单项，弹出metamask批准对话框
    //     let pop = await popupPromiser
    //     //document.querySelector('#loading__spinner')
    //     await waitForSelectorDisappear(pop, '#loading__spinner', 10, 1000, async (pg) => {
    //         await pg.reload()
    //         await lib.sleep(1000)
    //     });

    //     let btn = null //等待弹出对话框上批准按钮消失
    //     if (this.primaryButtonQuerySelector.isCSSSelector()) {
    //         btn=await pop.waitForSelector(this.primaryButtonQuerySelector.getSelector(), {timeout: this.timeout,visible:true})
    //     } else if (this.primaryButtonQuerySelector.isXPATHSelector()) {
    //         btn=await pop.$x(this.primaryButtonQuerySelector.getSelector())
    //     } else {
    //         throw new Error('未传入有效的QuerySelector类型，必须是css/xpath之一')
    //     }

    //     if (Objects.nonNull(this.asyncAfterOpenFunc)) {
    //         await this.asyncAfterOpenFunc(pop)
    //     }

    //     await btn.click()//点击弹出对话框上的批准按钮
    //     console.log(`点击了弹出对话框上按钮 ${JSON.stringify(this.primaryButtonQuerySelector)}`)
    //     return lib.Result.succ()
    // }

    /**
     * 弹出 targetcreated 模式对话框
     * @returns {Promise<lib.Result>}
     */
    async popupTargetcreated() {
        const popupPromiser = new Promise(resolve => this.browser.once('targetcreated', target => {
            let p2 = target.page()
            resolve(p2)
        }))
        if (Objects.nonNull(this.asyncBeforeOpenFunc)) {
            await this.asyncBeforeOpenFunc() //点击菜单项，弹出metamask批准对话框
            await lib.sleep(1000)
        }
        let pop = await popupPromiser
        const spinnerSelector='#loading__spinner'
        await waitForSelectorDisappear(pop, spinnerSelector, 10, 1000, async (pg) => {
            await pg.reload()
            await lib.sleep(1000)
        });

        let btn = null //等待弹出对话框上批准按钮消失
        if (this.primaryButtonQuerySelector.isCSSSelector()) {
            btn=await pop.waitForSelector(this.primaryButtonQuerySelector.getSelector(), {timeout: this.timeout,visible:true})
        } else if (this.primaryButtonQuerySelector.isXPATHSelector()) {
            btn=await pop.$x(this.primaryButtonQuerySelector.getSelector())
        } else {
            throw new Error('未传入有效的QuerySelector类型，必须是css/xpath之一')
        }

        if (Objects.nonNull(this.asyncAfterOpenFunc)) {
            await this.asyncAfterOpenFunc(pop)
        }

        await btn.click()//点击弹出对话框上的批准按钮
        console.log(`点击了弹出对话框上按钮 ${JSON.stringify(this.primaryButtonQuerySelector)}`)
        return lib.Result.succ()
    }
}

module.exports = {
    MetaMaskWrapper,
    MetamaskPopuper
}