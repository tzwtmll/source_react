function createElement(type, props, ...children) {
    // console.log(children);
    //  返回一个js对象，也就是虚拟dom
    return {
        type,
        props: {
            ...props,
            children: children.map(child => {
                // 对children的类型进行判断，是对象说明还有深层次,一直递归到文本为止
                if (Object.prototype.toString.call(child) === "[object Object]") {
                    return child
                } else {
                    return createTextElement(child)
                }
            })
        }
    }
}
function createTextElement(text) {
    return {
        // 保存格式的一致性
        type: 'TEXT-ELEMENT',
        props: {
            nodeValue: text, //将文本以对象的形式展示出来
            children: []
        }
    }
}
export default createElement