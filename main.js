import { createElement, render } from './micro-react'
var renderer = (value) => {
  const handleinput = (e) => {
    renderer(e.target.value)
  }
  const element = createElement(
    'h1',
    null,
    'hello',
    createElement(
      'input',
      { oninput: (e) => handleinput(e) },
    ),
    value
  )
  render(element, document.getElementById('root'))
}
renderer() // 初始化渲染，首先要执行一次