// 创建真实dom
function createDOM(fiber) {
    // console.log(1);
    const dom = fiber.type === 'TEXT_ELEMENT'
        ? document.createTextNode('')
        : document.createElement(fiber.type)
    // 给dom添加属性,排除children
    Object.keys(fiber.props)
        .filter(item => item !== 'children')
        .forEach(item => {
            dom[item] = fiber.props[item]
        })
    return dom
}
// 更新 dom 节点
function updateDom(dom, prevProps, nextProps) { // 通过比对 newprops 与 oldprops
    // 判断其是否是事件
    const isEvent = key => key.startWith('on')
    //  删除没用的，或者已经发送改变的
    
    // 判断是否更新
    Object.keys(prevProps)
        .filter(key => key === 'children')
        // .filter(key => !key in nextProps) // 我不能理解,与下列一样
        .filter(key => !Object.keys(nextProps).includes(key))
        .forEach(key => {
            dom[key] = ''
        })
    //  判断是否改变,改变则追加
    Object.keys(nextProps).filter(key => key !== 'children')
        .filter(key => !key in nextProps || prevprops[key] !== nextProps[key])
        .forEach(key => {
            dom[key] = nextProps[key]
        })
}


let nextUnitOfWork = null
let wipRoot = null
let cuurentRoot = null
let deletions = null



// 发出第一个fiber
function render(element, container) {
    // 创建与 createElement一样的结构形式，这就是一个fiber
    wipRoot = {
        dom: container, // 这个就是根节点，写死就行
        props: {
            children: [element]
        },
        // 为了使整体跟家清晰
        child: null,
        sibling: null,
        parent: null,
        alternate: cuurentRoot
    }
    deletions = []
    nextUnitOfWork = wipRoot
}
function commitRoot() {
    deletions.forEach(commitWork)
    commitWork(wipRoot.child)
    cuurentRoot = wipRoot
    wipRoot = null
}
// 防止 requestIdleCallback 打断渲染，等待全部渲染完全后，再组装
function commitWork(fiber) {
    // 组装dom
    if (!fiber) {
        // 如果不存在，也不停止
        return
    }
    // root
    const parentDOM = fiber.parent.dom
    // parentDOM.append(fiber.dom) // 重复构建dom树，我们通过 effectTag的值进行对比，判断进行什么层次的更新
    if (fiber.effectTag === 'PLACEMENT' && fiber.dom != null) { // 行增了
        parentDOM.append(fiber.dom)
    } else if (fiber.effectTag === 'UPDATE' && fiber.dom != null) {
        updateDom(fiber.dom, fiber.alternate.props, fiber.props)
    } else if (fiber.effectTag === 'DELETION') {
        parentDOM.removeChild(fiber.dom)
    }
    commitWork(fiber.child)
    commitWork(fiber.sibling)
}
function workloop(deadline) {
    while (nextUnitOfWork && deadline.timeRemaining() > 1) { // 这里不能使用if，因为if没有循环行        
        // performUnitOfwork 一个处理器 ，放入fiber，返回fiber
        nextUnitOfWork = performUnitOfwork(nextUnitOfWork)
    }
    // nextUnitOfWork存在则一直请求
    if (nextUnitOfWork) {
        requestIdleCallback(workloop)
    }
    if (!nextUnitOfWork && wipRoot) {
        commitRoot()
    }
}
function performUnitOfwork(fiber) {
    // 创建dom元素
    if (!fiber.dom) {
        // 除了第一个传入的 root 根节点不用创建 dom，其他虚拟dom都需要执行
        // 创建真实dom        
        fiber.dom = createDOM(fiber)
    }
    // 追加到父节点,有父节点就添加上去，组合真实dom，
    // 此时递归，会被浏览器打断，所以我们等待dom渲染完成后组装
    // if (fiber.parent) {
    //     fiber.parent.dom.append(fiber.dom)
    // }
    // 给children新建fiber，我们的概念是一个child，其他都是child的兄弟
    const elements = fiber.props.children
    reconcileChildren(fiber, elements) // 缓存处理diff，优化
    // 因为下面的创建方式，每次都会重新创建dom树，所以会消耗性能
    // let index = 0
    // // 用于保存上一个 sibling fiber 结构
    // let preSibling = null
    // // 构建fiber树,做完这一套操作，树构建好后
    // while (index < elements.length) {
    //     const element = elements[index] // root第一个节点必须是一个div
    //     const newFiber = {
    //         type: element.type,
    //         props: element.props,
    //         parent: fiber,
    //         dom: null,
    //         child: null,
    //         sibling: null
    //     }
    //     // 第一个是子节点，其他的子的兄弟节点
    //     if (index === 0) {
    //         // 排名第一的是儿子
    //         fiber.child = newFiber
    //     } else {
    //         //  后面的都是儿子的兄弟
    //         preSibling.sibling = newFiber
    //     }
    //     // 
    //     preSibling = newFiber
    //     // 后面的都是子的兄弟节点，为的是保持一对一的关系
    //     index++
    // }
    // 此时树已经构建好，只需要写逻辑就行
    // 优先级问题，只要有子，就一直把下走到底，然后在再把上走，找父的兄弟
    if (fiber.child) {
        return fiber.child
    }
    // 保存父节点
    let nextFiber = fiber
    // 当子节点走完后，再走子的兄弟节点
    while (nextFiber) { //如果还存在，就一直找，找到没有为止，再找父的兄弟，伯伯节点
        if (nextFiber.sibling) {
            // 子节点走完后，再把上面走，找到缓存中父节点的兄弟节点
            return nextFiber.sibling
        }
        nextFiber = nextFiber.parent
    }
}
requestIdleCallback(workloop)
//  wipFiber中缓存有上一次的 fiber,elements是这一次的fiber的child，通过对比判断更新
// 新建 newFiber
function reconcileChildren(wipFiber, elements) {
    let index = 0
    // 用于保存上一个 sibling fiber 结构
    let prevSibling = null
    // 对第二次 render 做出一些处理，因为我们保存了上一次的fiber
    // 所以这里我们可以通过 alternate 来获取上一次render的oldfiber
    // 通过对新老fiber的 type 的对比，判断是否需要做操作
    let oldFiber = wipFiber.alternate && wipFiber.alternate.child
    // 可能有增删，所以需要取多的循环,上一次render与下一次render的child对比
    while (index < elements.length || oldFiber != null) {
        var element = elements[index]
        var sameType = oldFiber && elements && element.type === oldFiber.type
        var newFiber = null
        if (sameType) {
            // 更新
            newFiber = {
                type: oldFiber.type, //更新，原来type未改变
                props: element.props, // 用自己的elements.props,更新再其中
                dom: oldFiber.dom,
                parent: wipFiber,
                alternate: oldFiber,
                effectTag: 'UPDATA'
            }
        }
        if (element && !sameType) { //element有，oldfiber没用，就是新增了
            // 新建
            newFiber = {
                type: element.type,
                props: element.props,
                dom: null,
                parent: wipFiber,
                alternate: null,
                effectTag: 'PLACEMENT'
            }
        }
        if (oldFiber && !sameType) { //elements没有，oldfiber有，就是被删除了
            // 删除
            oldFiber.effectTag = 'DELETION'
            deletions.push(oldFiber)
        }
        if (oldFiber) {
            // 因为 child 只能有一个，所以访问'其他'child，需要通过child的sibling
            oldFiber = oldFiber.sibling
        }
        // 第一个为儿子，其他为儿子兄弟
        if (index === 0) {
            wipFiber.child = newFiber
            // 保存下来，>2 就是兄弟
            prevSibling = newFiber
        } else {
            // 大于二都是兄弟
            prevSibling.sibling = newFiber
        }
        index++
    }
}

export default render