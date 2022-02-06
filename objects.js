/**
 * 判断对象是否是null
 * @param {object} obj 
 * @returns {boolean}
 */
function isNull(obj) {
    return typeof obj ==='undefined' || obj ===null
}

/**
 * 判断对象是否是非空
 * @param {object} obj 
 * @returns {boolean}
 */
function nonNull(obj) {
    return !isNull(obj)
}

/**
 * 判断某实例是否是某个类
 * @param {object} obj 
 * @param {string} className 
 * @returns {boolean}
 */
function isClassOf(obj, className) {
    return nonNull(obj) && nonNull(obj.constructor) && obj.constructor.name===className
}

/**
 * 判断对象是否是非空
 * @param {object} obj 
 * @returns 
 */
function requireNonNull(obj) {
    if (isNull(obj)) {
        throw new Error('requireNonNull发现传入对象是空')
    }
    return obj
}

module.exports = {
    isNull,
    nonNull,
    requireNonNull,
    isClassOf
}
