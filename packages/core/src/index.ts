

import {style as styleFn, styleBehavior as _styleBehavior, StyleBehavior} from './combinator/style'
import {curry2, CurriedFunction2} from '@most/prelude'
import {TextStream, DomStream, NodeType, NodeStream, ComponentBehaviors, ComponentActions, Func} from './types'
import {Branch} from './combinator/branch'
import {node, text, element} from './source/node'
import {domEvent as _domEvent} from './combinator/event'
import {component as _component} from './combinator/component'
import {nullSink} from './utils'
import {Stream} from '@most/types'
import {attr as _attr} from './combinator/attribute'


interface DomEvent {
  <K extends keyof HTMLElementEventMap>(eventType: K): (node: HTMLElement, options?: boolean) => Stream<HTMLElementEventMap[K]>
  <K extends keyof HTMLElementEventMap>(eventType: K, node: HTMLElement, options?: boolean): Stream<HTMLElementEventMap[K]>
}

interface Component {
  <T, K extends keyof T>(model: ComponentActions<T, K>): (view: Func<ComponentBehaviors<T, K>, Stream<NodeType>>) => Stream<HTMLElement>
  <T, K extends keyof T>(model: ComponentActions<T, K>, view: Func<ComponentBehaviors<T, K>, Stream<NodeType>>): Stream<HTMLElement>
}



const component: Component = curry2(_component)
const domEvent: DomEvent = curry2(_domEvent)
const style = curry2(styleFn)
const styleBehavior = curry2(_styleBehavior)
const attr = curry2(_attr)
const branch = curry2((ps: NodeStream, cs: DomStream) => new Branch(ps, cs))



export {
  CurriedFunction2,
  attr,
  Stream,
  domEvent,
  DomEvent,
  StyleBehavior,
  styleBehavior,
  component,
  Component,
  ComponentBehaviors,
  ComponentActions,
  nullSink,
  node,
  text,
  element,
  style,
  branch,
  TextStream,
  DomStream,
  NodeType
}
