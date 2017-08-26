

import { style, styleBehaviour } from './combinator/style'
import { curry2 } from '@most/prelude'
import { NodeStreamLike, Actions, Behaviors } from './types'
import { Branch } from './combinator/branch'
import { NodeSource, TextNodeSource } from './source/node'
import { DomEvent } from './combinator/event'
import { nullSink } from './utils'
import { Component } from './component/component'


export interface DomEventCurry {
  <T extends Event>(name: string, node: Node, capture: boolean): DomEvent<T>
  <T extends Event>(name: string): (node: Node, capture?: boolean) => DomEvent<T>
}

export interface BranchCurry {
  (cs: NodeStreamLike, ps: NodeStreamLike): Branch
  (cs: NodeStreamLike): (ps: NodeStreamLike) => Branch
}

const branch: BranchCurry = curry2((ps: NodeStreamLike, cs: NodeStreamLike) =>
  new Branch(ps, cs)
)

function element (tagname: string) {
  return new NodeSource(tagname)
}

function text (str: string) {
  return new TextNodeSource(str)
}

const node = element('node')

const domEvent: DomEventCurry = curry2(<T extends Event> (name: string, node: Node, capture = false) =>
  new DomEvent<T>(name, node, capture)
)

const component = <K extends string, T>(model: Actions<K, T>, view: (x: Behaviors<K, T>) => any) => new Component(model, view)

export {
  domEvent,
  text,
  styleBehaviour,
  component,
  nullSink,
  node,
  style,
  element,
  branch
}
