// 通过索引保存数据在 hooksStates 获取也通过索引获取
let hooksStates = []
// hooksIndex++ // 为后面再次调用 useCallback 提供空间
let hooksIndex = 0
function useState(inintState) {
    //  通过索引存值  
    hooksStates[hooksIndex] = hooksStates[hooksIndex] || inintState
    // 应当先把自己的 index 保留，因为 setState 都一样
    var cuurentIndex = hooksIndex
    function setState(newState) {
        // 如果这里使用 hooksIndex 的话，会出现将值赋值给下一项
        // 因为 hooksIndex在执行完后会++的，再次调用的话，就对不到值了，所以需要件index缓存
        hooksStates[cuurentIndex] = newState
        render()
    }
    // 为下一次调用 存 取数据不冲突,使 外部索引 增加1  index++ 
    return [hooksStates[hooksIndex++], setState]
}
// 原理与useState一样
function useReducer(reducer, inintstate) {
    hooksStates[hooksIndex] = hooksStates[hooksIndex] || inintstate
    var currentIndex = hooksIndex
    function dispatch(action) {
        console.log(hooksStates[currentIndex]);
        hooksStates[currentIndex] = reducer(hooksStates[currentIndex], action)
        render()
    }
    return [hooksStates[hooksIndex++], dispatch]
}

function useEffect(callback, dependencies) {
    if (!hooksStates[hooksIndex]) { // 初始化渲染 render() 缓存函数
        // 调用函数，返回一个函数，这个函数就是下一次执行的销毁函数
        // 执行 useEffect 中的程序，且返回要销毁dectory，下一次执行时销毁
        var dectory = callback()
        hooksStates[hooksIndex] = [dectory, dependencies]
        hooksIndex++ // hooksIndex++  为后面再次调用 useCallback 提供空间
    } else {//如果有缓存
        // 取出缓存 let 获取数据
        let [preDectory, preDependencies] = hooksStates[hooksIndex]
        var same = false // 如果依赖性不存在，我们直接执行,视为每一次都发送改变，无意义
        if (preDependencies) { // 可能没有依赖项，我们首先需要做出判断
            // 当依赖性存在时不管是 [] 或是 [state]
            same = dependencies.every((item, index) => item === preDependencies[index])
        }
        if (same) { //如果依赖未发送改变，我们无需重新渲染
            hooksIndex++  //为后面再次调用 useCallback 提供空间
        } else {// 如果依赖发送改变，说明有依赖项，且发送了改变，说明相当监听函数
            // 现在我们需要重新缓存，且执行缓存的 dectory 
            preDectory && preDectory() // 可能没有依赖项，我们当preDectory存在时执行
            var dectory = callback() // 执行 useEffect 中的程序，且返回要销毁dectroy
            hooksStates[hooksIndex] = [dectory, dependencies]
            hooksIndex++  //为后面再次调用 useCallback 提供空间
        }
    }
}

// 为什么需要 useMmeo ，当页面重新渲染后，对象完全一样，但对象的地址也已经发送改变
// 已经不是同一片地址了，所以我们需要缓存这个对象，保留这个地址
function useMemo(factory, dependencies) {
    // 判断是否有缓存，如果没有缓存，说明是一次初始化渲染，我们只需要 '缓存' 即可 
    if (!hooksStates[hooksIndex]) {
        var newMemo = factory() // useMemo(()=><Child/>) 调用函数获取返回值，相当于这一次缓存 
        // 再将缓存对象与依赖存入存入 hooksStates 即可，依赖主要是一个判断作用
        hooksStates[hooksIndex] = [newMemo, dependencies]
        // 防止下一次存入冲突，我们 +1 即可
        hooksIndex++
        return newMemo
    } else {
        // 如果有缓存，我们只需要根据依赖判断即可，根据依赖的对比，判断返回值
        // 我们首先取出依赖
        var [preMemo, preDependencies] = hooksStates[hooksIndex]
        // 只要依赖有一项发生改变，我们就需要做出判断, every 只要有一个false。则未false
        var same = dependencies.every((item, index) => {
            // new新依赖 与 pre老依赖的每一项我们都需要比较到
            return item === preDependencies[index]
        })
        if (same) {
            // 防止下一次传值冲突 +1 即可
            hooksIndex++
            // 依赖为发送改变，我们返回 preMemo 即可
            return preMemo
        } else {
            // 如果发送改变，我们又需要缓存这一次的值，返回最新的 newMemo
            var newMemo = factory()
            hooksStates[hooksIndex] = [newMemo, dependencies]
            // 防止下一次传值冲突 +1 即可
            hooksIndex++
            return newMemo
        }
    }
}
function useCallback(callback, dependencies) {
    if (!hooksStates[hooksIndex]) { // 不存在=>缓存函数
        // 第一次渲染render()，缓存函数
        hooksStates[hooksIndex] = [callback, dependencies]
        hooksIndex++ // 为后面再次调用 useCallback 提供空间
        return callback
    } else { // 有缓存，根据 dependencies 做判断
        // 根据 dependencies 判断是否返回上一个函数来触发不更新
        [preCallback, preDependencies] = hooksStates[hooksIndex]
        // 通过比较 preDependencies 与 dependencies 是否完全一致
        // 来判断是否返回缓存的函数来不更新
        let same = dependencies.every((item, index) => item === preDependencies[index])
        if (same) { // 依赖未改变，我们返回缓存的函数，这样就不会重新渲染
            hooksIndex++ // 为后面再次调用 useCallback 提供空间
            return preCallback
        } else { // 依赖改变，我们缓存这一次的函数，为下一次比较作准备
            hooksStates[hooksIndex] = [callback, dependencies]
            hooksIndex++ // 为后面再次调用 useCallback 提供空间
            // 返回这一次的 callback ，使视图更新 ，两次引用地址不一样
            return callback
        }
    }
}

export {
    useState,
    useReducer,
    useEffect,
    useMemo,
    useCallback
}