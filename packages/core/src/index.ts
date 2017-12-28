

import { style, styleBehaviour } from './combinator/style'
import { curry2, CurriedFunction2 } from '@most/prelude'
import { NodeStream, Actions, Behaviors, TextStream, DomStream, DomType, NodeType } from './types'
import { Branch } from './combinator/branch'
import { text, node, element } from './source/node'
import { DomEvent } from './combinator/event'
import { nullSink } from './utils'
import { Component } from './component/component'
import { Stream } from '@most/types'


export interface DomEventCurry {
  <T extends Event>(name: string, node: Node, capture?: boolean): DomEvent<T>
  <T extends Event>(name: string): (node: Node, capture?: boolean) => DomEvent<T>
}

const branch = curry2<NodeStream, DomStream, Branch>((ps: NodeStream, cs: DomStream) =>
  new Branch(ps, cs)
)


const domEvent: DomEventCurry = curry2(<T extends Event>(name: string, node: Node, capture = false) =>
  new DomEvent<T>(name, node, capture)
)

const component = <K extends string, T>(model: Actions<K, T>, view: (x: Behaviors<K, T>) => any) => new Component(model, view)

export {
  CurriedFunction2,
  Stream,
  domEvent,
  styleBehaviour,
  component,
  nullSink,
  node,
  text,
  element,
  style,
  branch,
  NodeStream,
  TextStream,
  DomStream,
  DomType,
  NodeType
}
