import {
  SettableDisposable,
  empty,
  type ISink,
  type IStream,
  type ITime,
  isFunction,
  merge,
  never,
  propagateRunEventTask
} from '@/stream'
import { stream } from '@/stream-extended'
import type { I$Node, I$Op, I$Slottable, I$Text, INode, INodeCompose, ITextNode } from './types.js'

function emitNode<T>(time: ITime, sink: ISink<T>, value: T): void {
  sink.event(time, value)
}

export function createNode<TElement>(
  createElement: () => TElement,
  postOp: I$Op<TElement> = x => x
): INodeCompose<TElement> {
  const nodeComposeFn = (...input: (I$Op<unknown> | I$Slottable<unknown>)[]): INodeCompose | I$Node => {
    if (input.some(isFunction)) {
      const ops = input as I$Op<TElement>[]
      const composedOps = [postOp, ...ops].reduce((acc, fn) => (x: I$Node<TElement>) => fn(acc(x)))

      return createNode(createElement, composedOps)
    }

    const $segments = input.length ? (input as I$Slottable<TElement>[]) : [never as I$Slottable<TElement>]
    const $branch = stream((sink, scheduler) => {
      const nodeState: INode<TElement> = {
        element: createElement(),
        $segments,
        styleBehavior: [],
        styleInline: [],
        propBehavior: [],
        style: {},
        attributesBehavior: [],
        attributes: {},
        stylePseudo: [],
        disposable: new SettableDisposable()
      }

      const nodeTask = scheduler.asap(propagateRunEventTask(sink, emitNode, nodeState))

      return nodeTask
    })

    return postOp($branch)
  }

  return nodeComposeFn as INodeCompose<TElement>
}

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
