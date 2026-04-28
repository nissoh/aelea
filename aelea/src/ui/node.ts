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

/**
 * Lower-level factory: given an element builder, return an `INodeCompose`
 * that collects children + ops and emits an `INode` on subscribe. Most
 * consumers should reach for `$element` / `$svg` / `$custom` / `$node`
 * / `$wrapNativeElement` instead — which call `createNode` with the
 * appropriate environment-aware builder.
 */
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
    // The element descriptor is created per-subscription so placing the
    // same compose in multiple segments yields independent mounts (each
    // gets its own DOM element). A `nodeEvent` op tethers off the same
    // subscription — both sides see the same fresh descriptor, so the
    // renderer's write to `.native` is visible to the event binder.
    const $branch = stream((sink, scheduler) => {
      const nodeDisposable = new SettableDisposable()
      const nodeState: INode<TElement> = {
        element: createElement(),
        disposable: nodeDisposable,
        $segments,
        styleBehavior: [],
        styleInline: [],
        propBehavior: [],
        style: {},
        attributesBehavior: [],
        attributes: {},
        stylePseudo: []
      }

      const nodeTask = scheduler.asap(propagateRunEventTask(sink, emitNode, nodeState))

      // Return a disposable that fires both — the asap task (in case the
      // emit hasn't happened yet) AND the node's per-instance disposable
      // (so the renderer's "remove this element" hook runs on upstream
      // teardown, e.g. joinMap's endInner after `until(remove)` fires).
      return disposeBoth(nodeTask, nodeDisposable)
    })

    return postOp($branch)
  }

  return nodeComposeFn as INodeCompose<TElement>
}

/**
 * Opaque element descriptor carried on `INode.element`. Aelea node
 * factories produce these; each renderer (DOM, takumi, manifest…)
 * interprets them at mount time — `aelea/ui` itself contains no DOM
 * feature-detection:
 *
 *  - DOM renderer:    `document.createElement(tag)` (or `NS(namespace, tag)`)
 *                     at mount, writes the real element back to `.native`
 *                     so downstream DOM helpers (`nodeEvent`) can
 *                     reach it via the shared descriptor.
 *  - Takumi renderer: reads `tag` directly to project to
 *                     `container` / `image` nodes.
 *  - `$wrapNativeElement` pre-populates `.native` so the DOM renderer
 *    reuses an existing element instead of creating a fresh one.
 *
 * The static type on the `INodeCompose` return is the native shape
 * (`HTMLInputElement`, `SVGRectElement`, …) because ui-components that
 * expect `ISlottable<HTMLInputElement>` rely on per-tag narrowing.
 * Runtime value is the descriptor; users never read `.element` directly
 * — they bind reactive styles / attrs / event tethers that flow through
 * streams, and the renderer resolves descriptor → real element there.
 */
export interface IElementDescriptor {
  tag: string
  namespace: 'html' | 'svg'
  /** Filled in by the renderer on mount, or pre-set by `$wrapNativeElement`. */
  native?: unknown
}

/**
 * HTML tag factory. The `INodeCompose` return is typed per tag
 * (`HTMLInputElement` for `'input'`, etc.) so downstream combinators
 * narrow correctly; at runtime it's a descriptor that the renderer
 * materializes. No DOM access happens here — the factory is pure.
 */
export function $element<K extends keyof HTMLElementTagNameMap>(tag: K): INodeCompose<HTMLElementTagNameMap[K]>
export function $element(tag?: string): INodeCompose<HTMLElement>
export function $element(tag = 'div') {
  return createNode(() => ({ tag, namespace: 'html' }) as unknown as HTMLElement)
}

/** SVG-namespaced factory; the renderer uses `createElementNS` if rendering to a DOM. */
export function $svg<K extends keyof SVGElementTagNameMap>(tag: K): INodeCompose<SVGElementTagNameMap[K]>
export function $svg(tag: string): INodeCompose<SVGElement>
export function $svg(tag: string) {
  return createNode(() => ({ tag, namespace: 'svg' }) as unknown as SVGElement)
}

/** Custom / non-standard tag name — HTML-namespaced, no type narrowing. */
export function $custom(tag: string): INodeCompose<HTMLElement> {
  return createNode(() => ({ tag, namespace: 'html' }) as unknown as HTMLElement)
}

/** Convenience alias for `$element('div')`. */
export const $node: INodeCompose<HTMLElement | SVGElement> = createNode<HTMLElement | SVGElement>(
  () => ({ tag: 'div', namespace: 'html' }) as unknown as HTMLElement
)

/**
 * Wrap a pre-existing native element so renderers target it directly.
 * The descriptor carries `native` so the DOM renderer skips creating
 * a fresh element; non-DOM renderers can still read `tag` / `namespace`.
 */
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
    // Reactive source: wrap in `state` so the renderer's later subscription
    // replays the most recent value. Prime it eagerly here so our slot
    // registers in shared multicasts at the same sync tick as sibling
    // `styleBehavior` / sibling-text subscriptions — if we waited for the
    // asap manifest-emit, we'd join the multicast sinkList *after* its
    // first emission, and late subscribers miss it by design.
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
