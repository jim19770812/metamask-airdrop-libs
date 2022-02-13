const puppeteer = require('puppeteer')
const puppeteerExtra = require('puppeteer-extra')
const lib = require('./libs.js')
const browser_wrapper = require('./wrappers')
const Objects = require('./objects.js')
const Stealth = require('puppeteer-extra-plugin-stealth')

class BrowserWrapper{
    /**
     * 构造函数
     * @param {object} config 
     */
    constructor(config) {
        this.config = config
        this.browser=null
    }

    /**
     * 
     * @param {puppeteer.Browser} browser 
     * @returns {BrowserWrapper}
     */
    static ofBrowser(browser) {
        let result = new BrowserWrapper(null)
        result.browser = browser
        return result
    }

    /**
     * 
     * @returns 获取配置
     */
    getConfig() {
        return this.config
    }

    async getPageCount() {
        return await (await this.browser.pages()).length
    }

    /**
     * 创建浏览器
     * @returns {Promise<puppeteer.Browser>}
     */
    async createBrowser() {
        // @ts-ignore
        puppeteerExtra.use(Stealth())
        const height = 890
        const width=1100
        let args = [
                `--window-size=${width},${height}`,
                `--load-extension=${this.config.extension}`,
                `--disable-extensions-except=${this.config.extension}`,
                `--user-data-dir=${this.config.user_dir}`,
                '--lang=zh-CN',
                '--lang=zh_CN.UTF-8',
                '--disable-bundled-ppapi-flash',
                '--mute-audio',
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-gpu',
                '--disable-java', //禁用java
                '--disable-xss-auditor', //关闭xss auditor
                '--disable-webgl', //禁用webgl
                '--disable-web-security', //关闭web安全
                //'--disable-popup-blocking',
                '--allow-running-insecure-content', //允许不安全内容
                //'–-window-size = 1366,850'  // window-size=1920x3000
                '--ignore-certificate-errors',  //忽略证书错误
                '--disable-dev-shm-usage', //禁止使用默认的/dev/shm共享内存（只有64M不够用）
                '--shm-size=1gb', //设置足够额共享内存大小
                '--process-per-tab', //每个标签使用单独的进程，开启后每个请求会开一个独立的浏览器窗口
                '--first-run', //重置到首次运行
                //'--incognito', //隐身模式启动，开启隐身模式会打开较多新窗口
        ]
        if (Objects.nonNull(this.config.proxy_server) && this.config.proxy_server !== "") { //设置代理服务器
            args.push(`--proxy-server=${this.config.proxy_server}`)
        }
        //Puppeteer.launch.AUTOMATION_ARGS.remove("--enable-automation")
        // @ts-ignore
        this.browser = await puppeteerExtra.launch({
            ignoreDefaultArgs:['--enable-automation'],
            headless: this.config.headless,
            //logLevel: false,
            devtools: false,
            slowMo: true,
            dumpio: true,
            //autoClose: false,
            ignoreHTTPSErrors:true,
            handleSIGTERM:true,
            handleSIGINT:true,
            handleSIGHUP: true,
            executablePath: this.config.executable_path,
            defaultViewport: {
                width: width,
                height: height,
            },
            args: args
        })
        this.config=null
        return this.browser
    }

    /**
     * 创建页面
     * @returns Page
     */
    async createPage() {
        let page = await this.browser.newPage()
        let result=new PageWrapper(page)
        return result
    }

    /**
     * 创建页面并跳转
     * @param {string} url
     * @return {Promise<browser_wrapper.PageWrapper | null>}
     */
    async createPageAndGo(url) {
        try {
            let result = await this.createPage()
            console.log('创建新页面完成')
            await result.goto(url)
            console.log(`打开新页面:${url}完成`)
            return result
        } catch (e) {
            console.error(e)
            return null
        }
    }

    /**
     * 获取页面
     */
    async getPages() {
        // @ts-ignore
        // @ts-ignore
        let list = await this.browser.pages();
        let result=[]
        // @ts-ignore
        for (p in pages) {
            // @ts-ignore
            result.push(new PageWrapper(p))
        }
        return result
    }

    /**
     * 等待页面打开制定的数量就结束
     * @param {string} title 
     * @param {number} loopCount 
     * @returns {Promise<puppeteer.Page>}
     */
    async findPage(title, loopCount) {
        let loop = loopCount
        while (loop > 0) {
            let pageList = await this.browser.pages()
            try {
                for (let i = 0; i <= pageList.length - 1; i++) {
                    let ret = pageList[i]
                    let temp = await ret.title()
                    if (temp.indexOf(title) >= 0) {
                        return ret
                    }
                }
            } catch (e) {
                console.error(e)
            }
            loop--
            await lib.sleep(200) //等待100毫秒
        }
        return null
    }

    /**
     * 关闭无用的页面
     * @param {PageWrapper[]} keepPages 保留的页面
     */
    async closeUselessPages(keepPages) {
        let pages = await this.browser.pages()
        for (let i = 0; i <= pages.length - 1; i++) {
            let page = pages[i]
            // @ts-ignore
            let idx=keepPages.indexOf(page)
            if (idx >= 0) {
                continue
            }
            // @ts-ignore
            delete await page.close()
        }
    }

    // /**
    //  * 从弹出对话框上获取页面
    //  * @returns {PageWrapper}
    //  */
    // async findPageInPopupWindow() {
    //     this.browser.on(event, handler)
    // }
}

class PageWrapper{
    /**
     * @param {puppeteer.Page} page 
     */
    constructor(page) {
        if (Objects.isClassOf(page, "PageWrapper")) {
            throw new Error("传入的类型必须是Page类型，现在是PageWrapper类型")
        }
        this.page=page
    }

    static async of(page) {
        return new PageWrapper(page)
    }

    /**
     * 获取当前原生页面对象
     * @returns {puppeteer.Page}
     */
    getPage() {
        return this.page
    }

    /**
     * 
     * @param {number} timeout 
     * @return {Promise<Void>}
     */
    async setDefaultNavigationTimeout(timeout) {
        await this.page.setDefaultNavigationTimeout(timeout)
    }

    /**
     * 设置是否允许js
     * @param {boolean} enabled 
     */
    async setJavaScriptEnabled(enabled) {
        await this.page.setJavaScriptEnabled(enabled)
    }

    /**
     * 获取当前的浏览器
     * @returns {Promise<browser_wrapper.BrowserWrapper>}
     */
    getBrowser() {
        // @ts-ignore
        return BrowserWrapper.ofBrowser(this.page.browser())
    }

    /**
     * 查询xpath，返回列表
     * @param {string} xpath 
     * @returns {Promise<puppeteer.ElementHandle<Element>[]>}
     */
    async queryXpathList(xpath) {
        // @ts-ignore
        let ret = await this.page.$x(xpath)
        return ret
    }

    /**
     * 查询xpath，返回一个值
     * @param {string} xpath
     * @param {object} options
     * @returns {Promise<puppeteer.ElementHandle>}
     */
    async queryXpathFirst(xpath, options) {
        // @ts-ignore
        //let list = await this.page.$x(xpath)
        let ret = await this.page.waitForXPath(xpath, options)
        // if (await list.length == 0) {
        //     return null
        // }
        // const ret = list[0]
        return ret
    }

    // async queryXpathFirst(xpath, timeout) {
    //     // @ts-ignore
    //     let list = await this.page.$x(xpath)
    //     if (await list.length == 0) {
    //         return null
    //     }
    //     const ret = list[0]
    //     return ret
    // }

    /**
     * 查询选择器，返回元素列表
     * @param {string} selector 
     * @returns {Promise<puppeteer.ElementHandle[]>}
     */
    async querySelectorAll(selector) {
        let list = await this.page.$$(selector)
        return list
    }

    /**
     * 查询选择器，返回元素
     * @param {string} selector 
     * @param {object} option 
     * @returns {Promise<puppeteer.ElementHandle>}
     */
    async querySelectorFirst(selector, option) {
        let ret = await this.page.waitForSelector(selector, option)
        return ret
    }

    /**
     * 
     * @param {string} selector 
     * @param {object} option 
     * @returns {Promise<puppeteer.ElementHandle>}
     */
    async waitForSelector(selector, option) {
        return this.querySelectorFirst(selector, option)
    }

    /**
     * 点击某选择器
     * @param {string} selector 
     * @returns {Promise<PageWrapper>}
     */
    async click(selector) {
        await this.page.click(selector)
        return this
    }

    /**
     * 页面内容是空白
     */
    async isEmpty() {
        let ret = await this.page.content()
        return ret===""
    }

    /**
     * 获取页面title
     * @returns {Promise<String>}
     */
    async title() {
        return await this.page.title()
    }

    /**
     * 根据选择器输入字符
     * @param {string} selector 
     * @param {string} chars 
     * @requires {PageWrapper}
     */
    async type(selector, chars) {
        await this.page.type(selector, chars)
        return this
    }

    /**
     * 等待导航
     * @param {object} option
     * @returns {Promise<Void>}
     */
    async waitForNavigation(option) {
        
        // @ts-ignore
        return await this.page.waitForNavigation(option | {})
    }
    /**
     * 页面等待
     * @param {*} timeoutmsc 
     * @returns void
     */
    async waitForTimeout(timeoutmsc) {
        await this.page.waitForTimeout(timeoutmsc)
    }

    /**
     * 执行js代码
     * @param {puppeteer.EvaluateFn} func js回调
     * @param {object} option
     * @returns 
     */
    async evaluate(func, option) {
        let ret = await this.page.evaluate(func, option)
        return ret
    }

    /**
     * 
     * @param {string} url 
     * @returns {Promise<puppeteer.HTTPResponse>}
     */
    async goto(url) {
        return this.page.goto(url);
    }

    /**
     * @returns {Promise<void>}
     */
    async bringToFront() {
        return await this.page.bringToFront()
    }

    /**
     * 
     * @param {object} options 
     * @returns {Promise<Void>}
     */
    async reload(options) {
        if (Objects.isNull(options)) {
            options = {
                timeout: 300000,
                waitUntil: 'domcontentloaded'
            }
        }
        await this.page.reload(options)
    }

    /**
     * 
     * @param {string} eventName 
     * @param {(x)=>{}} handler 
     * @returns 
     */
    async once(eventName, handler) {
        // @ts-ignore
        const ret = await this.page.once(eventName, handler);
        return ret
    }

    /**
     * 
     * @param {puppeteer.PageEventObject} eventName 
     * @param {(x)=>{}} handler 
     * @returns 
     */
    async on(eventName, handler) {
        // @ts-ignore
        return await this.page.on(eventName, handler)
    }

    /**
     * 设置请求拦截
     * @param {boolean} val 
     */
    async setRequestInterception(val) {
        await this.page.setRequestInterception(val)
    }
}

/**
 * 元素包装器
 */
class ElementHandleWrapper{
    /**
     * 
     * @param {puppeteer.ElementHandle} element
     */
    constructor(element) {
        this.element = element
    }

    static async of(elementHandle) {
        return new ElementHandleWrapper(elementHandle)
    }

    /**
     * 获取元素的文字
     * @returns {Promise<string>}
     */
    async textContent() {
        return await(await this.element.getProperty('textContent')).jsonValue()
    }
    /**
     * 
     * @param {puppeteer.ElementHandle} elementHandle 
     * @returns {Promise<string>}
     */
    static async textContent(elementHandle) {
        return await(await elementHandle.getProperty('textContent')).jsonValue()
    }

    /**
     * 获取内部html
     * @returns {Promise<string>}
     */
    async innerHtml() {
        let ret = await(await (await this.element.getProperty('innerHtml')).jsonValue())
        // @ts-ignore
        return ret
    }

    /**
     * 获取内部html
     * @param {puppeteer.ElementHandle} elementHandle 
     * @returns {Promise<string>}
     */
    static async innerHtml(elementHandle) {
        let ret = await (await Objects.requireNonNull(elementHandle).getProperty('innerHtml').jsonValue())
        return ret
    }
    /**
     * 在节点列表中查找匹配文本的元素索引
     * @param {puppeteer.ElementHandle[]} elementList 
     * @param {string} text 
     * @returns {Promise<number>}
     */
    static async indexOfNodeByTextContent(elementList, text) {
        for (let result = 0; result <= elementList.length; result++) {
            let ele = elementList[result]
            let s = await ElementHandleWrapper.textContent(ele)
            if (s === text) {
                return result
            }
        }
        return -1
    }

    /**
     * 在节点列表中查找文本匹配的元素
     * @param {puppeteer.ElementHandle[]} elementList 
     * @param {string} text 
     * @returns {Promise<string>}
     */
    static async findNodeByTextContent(elementList, text) {
        let index = await ElementHandleWrapper.indexOfNodeByTextContent(elementList, text)
        if (index < 0) {
            return null
        }
        let ele = elementList[index]
        let ret = await ElementHandleWrapper.textContent(ele)
        return ret
    }

    /**
     * 查询xpath，返回列表
     * @param {string} xpath 
     * @returns {Promise<puppeteer.ElementHandle<Element>[]>}
     */
    async queryXpathList(xpath) {
        // @ts-ignore
        let ret = await this.element.$x(xpath)
        return ret
    }

    /**
     * 查询xpath
     * @param {string} xpath 
     * @returns {Promise<puppeteer.ElementHandle>}
     */
    async queryXpathFirst(xpath) {
        // @ts-ignore
        let list = await this.element.$x(xpath)
        if (await list.length == 0) {
            return null
        }
        const ret = list[0]
        return ret
    }

    /**
     * 查询选择器，返回元素列表
     * @param {string} selector 
     * @returns {Promise<puppeteer.ElementHandle[]>}
     */
    async querySelectorAll(selector) {
        let list = await this.element.$$(selector)
        return list
    }

    /**
     * 查询选择器，返回元素
     * @param {string} selector 
     * @returns {Promise<puppeteer.ElementHandle>}
     */
    async querySelectorFirst(selector) {
        let ret = await this.element.$(selector)
        return ret
    }

    /**
     * 
     * @param {string} selector 
     * @returns {Promise<puppeteer.ElementHandle>}
     */
    async waitForSelector(selector) {
        return this.querySelectorFirst(selector)
    }

    // /**
    //  * 点击某选择器
    //  * @returns {Promise<ElementHandleWrapper>}
    //  */
    // async click() {
    //     await this.element.click()
    //     return this
    // }

    /**
     * 点击元素，传入的page会自动waitForNagiation
     * @param {browser_wrapper.PageWrapper}} page 
     * @param {object} navOptions
     * @param {object} clickOptions
     * @returns {Promise<ElementHandleWrapper>}
     */
    async click(page, navOptions, clickOptions) {
        if (typeof (navOptions) === "undefined") {
            await this.element.click()
            return this
        }
        await Promise.all([
            page.waitForNavigation(navOptions),
            this.element.click(clickOptions)
        ])
        return this
    }
    /**
     * 根据选择器输入字符
     * @param {string} chars 
     * @param {object} option
     * @requires {PageWrapper}
     */
    async type(chars, option) {
        await this.element.type(chars, option)
        return this
    }

    /**
     * 元素获得焦点
     * @returns {Promise<Void>}
     */
    async focus() {
        await this.element.focus()
    }
}

/**
 * 查询选择器
 */
class QuerySelector{
    constructor(type, selector) {
        this.type = type
        this.selector=selector
    }
    /**
     * 获取类型（css/type）
     * @returns {string}
     */
    getType() {
        return this.type
    }
    /**
     * 设置类型（css/xpath）
     * @param {string} value 
     * @returns {QuerySelector}
     */
    setType(value) {
        this.type = value
        return this
    }
    /**
     * 是否是css选择器
     * @returns {boolean}
     */
    isCSSSelector() {
        return "css"===new String(this.type).toLowerCase()
    }
    /**
     * 是否是xpath选择器
     * @returns {boolean}
     */
    isXPATHSelector() {
        return "xpath"===new String(this.type).toLowerCase()
    }
    /**
     * 获取选择器
     * @returns {string}
     */
    getSelector() {
        return this.selector
    }
    /**
     * 设置选择器
     * @param {string} value 
     * @returns {QuerySelector}
     */
    setSelector(value) {
        this.selector = value
        return this
    }
}

/**
* 在节点列表里查找指定的eth地址索引
* @param {puppeteer.ElementHandle[]} nodeList
* @param {string} text
* @return {Promise<number>}
*/
async function indexOf(nodeList, text){
    for (let index = 0; index <= nodeList.length - 1; index++){
        let ele = new ElementHandleWrapper(nodeList[index])
        let temp=await ele.textContent()
        //console.log("textContent", temp)
        //const temp=await await(await ele.getProperty('textContent')).jsonValue()
        let s1 = new String(temp).toLowerCase()
        let s2=new String(text).toLowerCase()
        if (s1==s2){
            return index
        }
    }
    return -1
}

/**
 * 
 * 等待某个元素消失，如果不存在就触发事件，然后等待并继续检查，直到元素消失或者达到最大循环次数
 * @param {puppeteer.Page} page 
 * @param {string} selector 选择器
 * @param {number} loop 循环次数
 * @param {number} loopInreval 循环的间隔毫秒
 * @param {(pg)=>{}} asyncFunc 异步函数
 * @returns {Promise<Void>}
 */
async function waitForSelectorDisappear(page, selector, loop, loopInreval, asyncFunc) {
    let ele = null
    while (ele === null && loop > 0) {
        try {
            ele = await page.waitForSelector(selector, {
                timeout: 3000,
                visible:false
            })
            console.log(ele)
        } catch (e) {
            console.error(e)
        }
        if (Objects.nonNull(ele)) {
            await asyncFunc(page)
            await lib.sleep(loopInreval)
        } else {
            return ele
        }
        loop--
    }
    return null
}

module.exports = {
    BrowserWrapper,
    PageWrapper,
    ElementHandleWrapper,
    QuerySelector,
    indexOf,
    waitForSelectorDisappear
}