import { createElement, render } from './micro-react'
const element = createElement(
  'div',
  { id: 1 },
  'hello',
  createElement(
    'div',
    { id: 2 },
    'word'
  ),
  'word',
)
// 在这里我们需要引入 babel jsx进行解析，核心技术
// var VirtualDOM = (
//   // ele解析过来的结果与上列一样
//   <div id='1'>
//     <div id='2'>
//       <div id='3'></div>
//       <div id='4'></div>
//     </div>
//   </div>
// )
var root = document.getElementById('root')
render(element, root)
// console.log(root);