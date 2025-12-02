import {
  empty,
  type Fn,
  type ISink,
  type IStream,
  type ITime,
  isFunction,
  merge,
  never,
  propagateRunEventTask
} from '@/stream'
import { stream } from '@/stream-extended'
import type { I$Node, I$Op, I$Text, INode, INodeCompose, ITextNode, NodeKind } from './types.js'

function emitNode<T>(time: ITime, sink: ISink<T>, value: T): void {
  sink.event(time, value)
}

function createNode(
  kind: NodeKind,
  tag: string | null,
  postOp: Fn<I$Node<unknown>, I$Node<unknown>> = <T>(x: T): T => x
): INodeCompose<unknown> {
  const nodeComposeFn = (...input: (I$Op<unknown> | I$Node<unknown>)[]): INodeCompose<unknown> | I$Node<unknown> => {
    if (input.some(isFunction)) {
      const ops = input as I$Op<unknown>[]
      const composedOps = [postOp, ...ops].reduce((acc, fn) => (x: I$Node<unknown>) => fn(acc(x)))

      return createNode(kind, tag, composedOps)
    }

    const $segments = input.length ? (input as I$Node<unknown>[]) : [never]
    const $branch = stream((sink, scheduler) => {
      const nodeState: INode<unknown> = {
        kind,
        tag,
        $segments,
        styleBehavior: [],
        styleInline: [],
        propBehavior: [],
        style: {},
        insertAscending: true,
        attributesBehavior: [],
        attributes: {},
        stylePseudo: [],
        events: []
      }

      const nodeTask = scheduler.asap(propagateRunEventTask(sink, emitNode, nodeState))

      return nodeTask
    })

    return postOp($branch)
  }

  return nodeComposeFn as INodeCompose<unknown>
}

export const $element = (tag = 'div') => createNode('element', tag)
export const $custom = (tag: string) => createNode('custom', tag)
export const $node: INodeCompose = ((...args: any[]) => {
  const compose = createNode('node', 'node')
  return compose(...args)
}) as INodeCompose
export const $svg = (tag: string) => createNode('svg', tag)
export const $wrapNativeElement = (_element: unknown) => createNode('wrap', null)

export const $text = (...textSourceList: (IStream<string> | string)[]): I$Text => {
  if (textSourceList.length === 0) return empty

  const streams = textSourceList.map(source =>
    stream((sink, scheduler) => {
      const manifest: ITextNode =
        typeof source === 'string'
          ? {
              kind: 'text',
              value: source
            }
          : {
              kind: 'text',
              value: source
            }
      const task = scheduler.asap(propagateRunEventTask(sink, emitNode, manifest))
      return task
    })
  )

  return streams.length === 1 ? streams[0] : merge(...streams)
}
