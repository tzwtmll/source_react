function createElement(type, props, ...children) {
    return {
        type,
        props: {
            ...props,
            //  这样写的目的是取消差异化，保持格式一致
            children: children.map(child => {
                if (typeof child === 'object') {
                    return child
                } else {
                    //  如果不是对象，说明是文字，传入文字节点即可
                    return createTextElement(child)
                }
            })
        }
    }
}
// 创建文字节点，保持格式一致
function createTextElement(text) {
    return {
        type: "TEXT_ELEMENT",
        props: {
            nodeValue: text,
            children: []
        }
    }
}
export default createElement