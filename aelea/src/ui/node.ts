import {
  disposeBoth,
  empty,
  type ISink,
  type IStream,
  type ITime,
  isFunction,
  merge,
  never,
  nullSink,
  propagateRunEventTask,
  SettableDisposable
} from '../stream/index.js'
import { state, stream } from '../stream-extended/index.js'
import type { I$Node, I$Op, I$Slottable, I$Text, INode, INodeCompose, ITextNode } from './types.js'

function emitNode<T>(time: ITime, sink: ISink<T>, value: T): void {
  sink.event(time, value)
}

type Mutator<TElement> = (node: INode<TElement>) => INode<TElement>

const EMPTY_SEGMENTS: readonly I$Slottable<unknown>[] = [never as I$Slottable<unknown>]

export function createNode<TElement>(
  createElement: () => TElement,
  mutators: Mutator<TElement>[] = [],
  streamOps: I$Op<TElement>[] = []
): INodeCompose<TElement> {
  const nodeComposeFn = (...input: (I$Op<unknown> | I$Slottable<unknown>)[]): INodeCompose | I$Node => {
    if (input.some(isFunction)) {
      const newMutators = mutators.slice()
      const newStreamOps = streamOps.slice()
      // Once a streamOp has been seen, all subsequent decorators must wrap as
      // streamOps too so emission order matches source order.
      let inStreamPhase = newStreamOps.length > 0
      for (const op of input as I$Op<TElement>[]) {
        const mut = (op as unknown as { __mutate?: Mutator<TElement> }).__mutate
        if (typeof mut === 'function' && !inStreamPhase) {
          newMutators.push(mut)
        } else {
          newStreamOps.push(op)
          inStreamPhase = true
        }
      }
      return createNode(createElement, newMutators, newStreamOps)
    }

    const $segments =
      input.length > 0 ? (input as I$Slottable<TElement>[]) : (EMPTY_SEGMENTS as unknown as I$Slottable<TElement>[])
    // Element descriptor created per-subscription so the same compose placed
    // in multiple segments yields independent mounts. A `nodeEvent` op sees
    // the same fresh descriptor since both share the subscription.
    const $branch = stream<INode<TElement>>((sink, scheduler) => {
      const nodeDisposable = new SettableDisposable()
      const nodeState: INode<TElement> = {
        element: createElement(),
        disposable: nodeDisposable,
        $segments,
        staticStyles: [],
        styleBehavior: [],
        styleInline: [],
        propBehavior: [],
        attributesBehavior: [],
        attributes: {}
      }

      for (let i = 0; i < mutators.length; i++) mutators[i](nodeState)

      const nodeTask = scheduler.asap(propagateRunEventTask(sink, emitNode, nodeState))
      // Both disposables fire — the asap task (in case the emit hasn't
      // happened yet) AND the per-instance disposable (so the renderer's
      // "remove this element" hook runs on upstream teardown).
      return disposeBoth(nodeTask, nodeDisposable)
    })

    let result: I$Node<TElement> = $branch
    for (let i = 0; i < streamOps.length; i++) result = streamOps[i](result)
    return result
  }

  return nodeComposeFn as INodeCompose<TElement>
}

export interface IElementDescriptor {
  tag: string
  namespace: 'html' | 'svg'
  /** Filled in by the renderer on mount, or pre-set by `$wrapNativeElement`. */
  native?: unknown
}

export function $element<K extends keyof HTMLElementTagNameMap>(tag: K): INodeCompose<HTMLElementTagNameMap[K]>
export function $element(tag?: string): INodeCompose<HTMLElement>
export function $element(tag = 'div') {
  return createNode(() => ({ tag, namespace: 'html' }) as unknown as HTMLElement)
}

export function $svg<K extends keyof SVGElementTagNameMap>(tag: K): INodeCompose<SVGElementTagNameMap[K]>
export function $svg(tag: string): INodeCompose<SVGElement>
export function $svg(tag: string) {
  return createNode(() => ({ tag, namespace: 'svg' }) as unknown as SVGElement)
}

export function $custom(tag: string): INodeCompose<HTMLElement> {
  return createNode(() => ({ tag, namespace: 'html' }) as unknown as HTMLElement)
}

export const $node: INodeCompose<HTMLElement | SVGElement> = createNode<HTMLElement | SVGElement>(
  () => ({ tag: 'div', namespace: 'html' }) as unknown as HTMLElement
)

export function $wrapNativeElement<T extends Element = Element>(element: T): INodeCompose<T> {
  const descriptor: IElementDescriptor = {
    tag: (typeof element.tagName === 'string' && element.tagName.toLowerCase()) || 'div',
    namespace: 'html',
    native: element
  }
  return createNode<T>(() => descriptor as unknown as T)
}

export const $text = (...textSourceList: (IStream<string> | string)[]): I$Text => {
  if (textSourceList.length === 0) return empty

  const streams = textSourceList.map(source => {
    if (typeof source === 'string') {
      return stream<ITextNode>((sink, scheduler) => {
        const manifest: ITextNode = { kind: 'text', value: source }
        return scheduler.asap(propagateRunEventTask(sink, emitNode, manifest))
      })
    }
    // Wrap reactive source in `state` and prime it eagerly so this slot
    // registers in shared multicasts on the same sync tick as sibling
    // styleBehavior / sibling-text subscriptions — late subscribers would
    // otherwise miss the first emission.
    const cached = state(source)
    return stream<ITextNode>((sink, scheduler) => {
      const primeSub = cached.run(nullSink, scheduler)
      const manifest: ITextNode = { kind: 'text', value: cached }
      const emitTask = scheduler.asap(propagateRunEventTask(sink, emitNode, manifest))
      return disposeBoth(emitTask, primeSub)
    })
  })

  return streams.length === 1 ? streams[0] : merge(...streams)
}
