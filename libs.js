/**
 * 返回对象
 */
class Result{
    result=false
    message=""
    data=null
    // static succ(){
    //     let ret=new Result()
    //     ret.result=true
    //     return ret
    // }
    // eslint-disable-next-line no-dupe-class-members
    static succ(data){
        let ret=new Result()
        ret.result = true
        if (typeof (data) !== "undefined") {
            ret.data=data
        }
        return ret
    }
    static error(message){
        let ret=new Result()
        ret.result=false
        ret.message=message
        return ret
    }
    getData(){
        return this.data
    }
    getMessage(){
        return this.message
    }
    isSucc(){
        return this.result
    }
    isError(){
        return !this.result
    }
}

/**
 * 压缩字符串
 * @param {string} str 
 * @returns {string}
 */
function compress_str(str) {
    let s = String(str)
    let s1 = s.substring(0, 6);
    let s2 = s.substring(s.length - 4, s.length)
    return s1 + '...' + s2
}

// /**
// * 在节点列表里查找指定的eth地址索引
// * @param {puppeteer.ElementHandler[]} nodeList
// * @param {string} text
// * @return {int}
// */
// async function indexOf(nodeList, text){
//     for (let index = 0; index <= nodeList.length - 1; index++){
//         let ele = nodeList[index]
//         console.log("textContent", await ele.getProperty('textContent'))
//         const temp=await await(await ele.getProperty('textContent')).jsonValue()
//         let s1=new String(temp).toLowerCase()
//         let s2=String(text)
//         if (s1==s2){
//             return index
//         }
//     }
//     return -1
// }

/**
 * 等待
 * @param {number} ms 
 * @returns 
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
* 获取随机数
* @returns {number}
*/
function random(minVal, maxVal){
    return (Math.floor(Math.random()*maxVal*10)+minVal*10)/10;
}

// /**
//  * 非空判断
//  * @param {object} obj 
//  * @returns {boolean}
//  */
// function nonNull(obj){
//     return typeof obj !=='undefined' && obj !==null
// }


module.exports = {
    Result,
    sleep,
    compress_str,
    random,
}
