let nextUnitOfWork = null
let currentRoot = null
let wipRoot = null
let deletions = null
function createDOM(fiber) {
    const dom = fiber.type == "TEXT-ELEMENT"
        ? document.createTextNode("")
        : document.createElement(fiber.type)
    Object.keys(fiber.props)
        .filter(key => key !== 'children')
        .forEach(key => {
            dom[key] = fiber.props[key]
        })
    return dom
}
function render(element, container) {
    // 首先创建最大的 fiber
    wipRoot = { // work in progress root
        dom: container,
        props: {
            children: [element]
        },
        // 通过 父子兄将全部的fiber连接起来
        child: null,
        sibling: null,
        parent: null,
        alternate: currentRoot
    }
    deletions = [] //创建一个垃圾桶
    nextUnitOfWork = wipRoot
}
// 浏览器剩余时间请求
function workLoop(deadline) {
    while (nextUnitOfWork && deadline.timeRemaining() > 1) {
        nextUnitOfWork = performUnitOfWork(nextUnitOfWork)
    }
    // console.log(nextUnitOfWork);
    if (!nextUnitOfWork && wipRoot) {
        // 因为下面一直再递归请求，所以我们需要关掉这个循环
        // nextUnitOfWork有执行完的时候，到最后是 返回 undefined，
        // 但是 wipRoot 是存在是实例，需要手动关闭 令 wipFiber = null
        commitRoot()
    }
    requestIdleCallback(workLoop) //请求空闲时间
}

requestIdleCallback(workLoop)
function commitRoot() {
    deletions.forEach(commitWork)
    commitWork(wipRoot.child) //到此时，fiber 结构已经构建完
    currentRoot = wipRoot // 保存这一次的 fiber 为一下 render 提供缓存数据
    wipRoot = null
}
// 对于89行的优化
function commitWork(fiber) { // 此时的 fiber 就是根节点下面的第一个 div
    // 在这里我们进行一个组装，将异步转化为同步，此时 fiber 各个的关系已经全部构建好
    if (!fiber) {
        return
    }
    // 寻找最近的父dom节点
    let parentDomFiber = fiber.parent
    while (!parentDomFiber) {
        parentDomFiber = parentDomFiber.parent.dom
    }
    var parentDOM = parentDomFiber.dom
    // parentDOM.append(fiber.dom) 太粗暴了
    if (fiber.effectTag === 'PLACEMENT' && fiber.dom) {
        parentDOM.append(fiber.dom) // 创建
    } else if (fiber.effectTag === 'UPDATE' && fiber.dom) {
        updateDOM(fiber.dom, fiber.alternate.props, fiber.props)
    } else if (fiber.effectTag === 'DELETION' && fiber.props) {
        // parentDOM.removeChild(fiber.dom)
        commitDeletion(fiber, parentDOM)
    }
    commitWork(fiber.child)
    commitWork(fiber.sibling)
}
function commitDeletion(fiber, parentDOM) {
    if (fiber.dom) {
        parentDOM.removeChild(fiber.dom)
    } else {
        // 向下寻找最近的 dom ，因为函数没有dom
        commitDeletion(fiber.child, parentDOM)
    }
}
function performUnitOfWork(fiber) {
    // 创建真实dom，并组装
    if (!fiber.dom) {
        fiber.dom = createDOM(fiber)
    }
    // 处理 fiber 之间的关系
    reconcileChildren(fiber, fiber.props.children)
    // 优先级问题,有子找子，无子找兄弟，再找父的兄弟
    if (fiber.child) {
        return fiber.child
    }
    //到这个地方来了，就是子已经找完了，现在就是从最后一个儿子的兄弟把上开始找，找父的兄弟
    var nextFiber = fiber
    if (nextFiber) {
        if (nextFiber.sibling) {
            return nextFiber.sibling
        }
        nextFiber = nextFiber.parent
    }
}
function updateDOM(dom, prevProps, nextprops) {
    // 判断是否是事件
    const isEvent = key => key.startsWith('on') // 返回首字母是 'on' 的
    // 删除已经没有的props-------------------------------消除变量，防止内存泄漏---------------------------------------------------------
    Object.keys(prevProps)
        .filter(key => key !== 'children' && !isEvent(key))// 首先排除childrne与事件
        .filter(key => !(key in nextprops)) // 不在 nextprops 中，清空即可
        .forEach(key => {
            dom[key] = '' // 令他为空即可
        })
    // 判断是否有追加属性--------------------------更新值----------------------------------------------------------------
    Object.keys(nextprops)
        .filter(key => key !== 'children' && !isEvent(key))
        // 不在 prevprops 中，就是有新增属性，创建即可。或者都有，追加属性值即可
        .filter(key => !(key in prevProps) || prevProps[key] !== nextprops[key])
        .forEach(key => {
            dom[key] = nextprops[key] // 新增
        })
    // 删除事件-------------------------------------解绑，否则会照成内存泄漏----------------------------------------
    Object.keys(prevProps) // 一样的逻辑，prev有next无，就是要删除的事件
        .filter(isEvent) // 取出事件
        // 取出新的属性=>   没有，或者没有变化，为什么有一样的事件也要取消绑定，那是因为下面会一直绑定，所以我们需要取消上一个事件，再重新绑定，不解绑会照成内存泄漏
        .filter(key => !(key in nextprops) || prevProps[key] !== nextprops[key])
        .forEach(key => {
            const eventType = key.toLowerCase().substring(2) // onClick =>先转小写，再取第二位开始的后面，者就是事件类型
            // 再移除事件
            dom.removeEventListener(eventType, prevProps[key]) //删除prev上的事件即可
        })
    // 添加新事件----------------------------------绑定事件--------------------------------------------------------------
    Object.keys(nextprops)     // 一样的逻辑，next有prev无，就是要新增的事件
        .filter(isEvent)
        .filter(key => prevProps[key] !== nextprops[key]) //放回出没有的事件
        .forEach(key => {
            const eventType = key.toLowerCase().substring(2) // onClick =>先转小写，再取第二位开始的后面，者就是事件类型
            dom.addEventListener(eventType, nextprops[key])
        })
}
function reconcileChildren(wipFiber, elements) {
    // 我们可以有一个缓存，整体结构不发生改变，我们就复用，只改变数据即可
    var index = 0
    var prevSibling = null // 用于将父亲的第二个儿子保存为儿子的兄弟，各个fiber都是一对一
    var oldFiber = wipFiber.alternate && wipFiber.alternate.child // 将缓存的老fiber取出
    // 构建 fiber架构,使各个 fiber 都有关系
    while (index < elements.length || oldFiber) {
        var element = elements[index] // 具体化操作
        var sameType = oldFiber && element && oldFiber.type == element.type
        var newFiber = null
        if (sameType) { // type 未改变。说明整体dom结构未变，只是props改变，我们就不用构建整个dom
            newFiber = {
                type: oldFiber.type,
                props: element.props,
                dom: oldFiber.dom,
                // 继承dom
                parent: wipFiber,
                child: null,
                sibling: null,
                alternate: oldFiber, //依旧继承
                effectTag: 'UPDATE'
            }
        }
        // 新建
        if (element && !sameType) { // oldfiber不存在，渲染dom
            var newFiber = { //通过虚拟dom构建fiber
                type: element.type,
                props: element.props,
                // 与父fiber关联
                parent: wipFiber,
                dom: null, // 没用缓存，构建dom
                child: null,
                sibling: null,
                alternate: null,
                effectTag: 'PLACEMENT'
            }
        }
        // 删除
        if (oldFiber && !sameType) {
            oldFiber.effectTag = 'DELETION'
            deletions.push(oldFiber)
        }
        if (oldFiber) {
            // 因为只有一个儿子，再找其他儿子需要以儿子的兄弟的身份找，
            oldFiber = oldFiber.sibling
        }
        if (index === 0) { // 第一个为儿子，第二个为兄弟
            // 这里为什么要把 父fiber的儿子设置为 newFibr，这是因为都是单项数据流
            // 需要两边都绑定关系
            wipFiber.child = newFiber
        } else if (index > 0) { //兄弟
            prevSibling.sibling = newFiber
        }
        // 保存兄弟，其他的都是第一个儿子的兄弟，父不认识他，但是他认识他父亲
        prevSibling = newFiber
        index++
    }
}
export default render