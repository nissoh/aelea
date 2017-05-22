
import {
  branch, NodeStreamLike, Branch, node, text, renderTo,
  domEvent, DomEvent, component, Component, element, NodeStreamType
} from './node'
import { curry2, CurriedFunction2 } from '@most/prelude'
import { Stream } from '@most/types'
import { style, Style } from './style'
import { future } from './behaviour'
import { newDefaultScheduler } from '@most/scheduler'
import { requestFrameTask } from './raf'

const branchCurry = curry2(branch)
const domEventCurry = curry2(domEvent)
const styleCurry = curry2(style)

export {
  requestFrameTask,
  future,
  node,
  component,
  Component,
  text,
  renderTo,
  domEventCurry as domEvent,
  branchCurry as branch,
  styleCurry as style,
  NodeStreamLike,
  Style,
  element,
  NodeStreamType
}
