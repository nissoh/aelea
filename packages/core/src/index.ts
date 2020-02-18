import {NodeStream, DomNode, NodeType} from './types'
import {tap, startWith, never, empty, map} from '@most/core'
import {applyStyle} from './combinator/style'
import {nullSink} from './utils'
import {Scheduler, Stream} from '@most/types'


export * from './combinator/style'
export * from './combinator/event'
export * from './utils'
export * from './combinator/attribute'
export * from './behavior'
export * from './combinator/component'
export * from './source/node'
export * from './types'




function runEffect(ns: NodeStream<HTMLElement, unknown, any>, scheduler: Scheduler) {
  return map(ps => {

    tap(style => applyStyle(style, ps.node), ps.style).run(nullSink, scheduler)

    runEffect(
      tap(cs => {
        if (cs.slot < 1) {
          ps.node.appendChild(cs.node)
        } else {
          ps.node.insertBefore(cs.node, ps.node.children[cs.slot])
        }
      }, ps.children), scheduler
    ).run(nullSink, scheduler)

    return ps
  }, ns)
}

const forver = <T>(x: T) => startWith(x, never())

export function renderAt(node: NodeType, children: NodeStream<HTMLElement, unknown, any>): Stream<any> {
  const nnode: DomNode<NodeType, any, any> = {
    node,
    children,
    slot: 0,
    behavior: empty(),
    style: empty()
  }
  return {
    run(sink, scheduler) {
      return runEffect(forver(nnode), scheduler).run(sink, scheduler)
    }
  }
}