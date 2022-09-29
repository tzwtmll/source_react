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
let nextUnitOfWork = null
let wipRoot = null



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
        parent: null
    }
    nextUnitOfWork = wipRoot
}
function commitRoot() {
    commitWork(wipRoot.child)
    wipRoot = null
}
function commitWork(fiber) {
    if (!fiber) {
        return
    }
    const parentDOM = fiber.parent.dom
    parentDOM.append(fiber.dom)
    commitWork(fiber.child)
    commitWork(fiber.sibling)
}
function workloop(deadline) {
    // console.log(3);
    let shouleYield = false
    while (nextUnitOfWork && !shouleYield) { // 这里不能使用if，因为if没有循环行        
        // performUnitOfwork 一个处理器 ，放入fiber，返回fiber
        nextUnitOfWork = performUnitOfwork(nextUnitOfWork)
        // 如果小于 1ms ，则不执行
        shouleYield = deadline.timeRemaining() < 1
    }
    // 一直请求剩余时间
    requestIdleCallback(workloop)
    if (!nextUnitOfWork && wipRoot) {
        commitRoot()
    }
}
function performUnitOfwork(fiber) {
    // 这个 fiber 是传入的第一个 虚拟dom，</App>
    // 创建dom元素
    if (!fiber.dom) {
        // 除了第一个传入的 root 根节点不用创建 dom，其他虚拟dom都需要执行
        fiber.dom = createDOM(fiber)
    }
    // 追加到父节点,有父节点就添加上去
    // if (fiber.parent) {
    //     fiber.parent.dom.append(fiber.dom)
    // }
    // 给children新建fiber，我们的概念是一个child，其他都是child的兄弟
    const elements = fiber.props.children
    let index = 0
    // 用于保存上一个 sibling fiber 结构
    let preSibling = null
    // 构建fiber树,做完这一套操作，树构建好后
    while (index < elements.length) {
        const element = elements[index] // root第一个节点必须是一个div
        const newFiber = {
            type: element.type,
            props: element.props,
            parent: fiber,
            dom: null,
            child: null,
            sibling: null
        }
        // 第一个是子节点，其他的子的兄弟节点
        if (index === 0) {
            // 排名第一的是儿子
            fiber.child = newFiber
        } else {
            //  后面的都是儿子的兄弟
            preSibling.sibling = newFiber
        }
        // 
        preSibling = newFiber
        // 后面的都是子的兄弟节点，为的是保持一对一的关系
        index++
    }
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


// 实现fiber







export default render