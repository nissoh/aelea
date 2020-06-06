import { NodeStream } from './types'
import { tap, map, chain, mergeArray } from '@most/core'
import { applyStyle } from './combinator/style'
import { Stream, Sink } from '@most/types'
import { applyAttrCurry } from './combinator/attribute'
import { create } from './source/node'


export * from './combinator/style'
export * from './combinator/event'
export * from './utils'
export * from './combinator/attribute'
export * from './behavior'
export * from './combinator/component'
export * from './combinator/animate'
export * from './source/node'
export * from './types'

// tslint:disable-next-line: no-empty
const noop = () => { }

const justLogSink = <Sink<never>>{
  event: noop,
  error(_, e) {
    throw (e)
  },
  end: noop
}

export function nodeEffect(ns: NodeStream<HTMLElement, {}, any>): Stream<any> {
  return chain(ps => {
    return mergeArray([
      tap(style => applyStyle(style, ps.node), ps.style),
      tap(attrs => applyAttrCurry(attrs, ps.node), ps.attributes),
      nodeEffect(
        tap(cs => {
          if (ps.node.children.length < 1) {
            ps.node.appendChild(cs.node)
          } else {
            ps.node.insertBefore(cs.node, ps.node.children[cs.slot])
          }
        }, ps.children)
      )
    ])
  }, ns)
}



export function renderAt(node: Node, children: NodeStream<HTMLElement, {}, any>): Stream<any> {
  const rootNode = create(map(() => node))('')(
    children
  )
  return nodeEffect(rootNode as any)
}
