import { constant, continueWith, filter, type IStream, map, o, switchLatest, until } from '../../stream/index.js'
import { fromCallback } from '../../stream-extended/index.js'
import type { ISlottable } from '../../ui/index.js'
import { fromEventTarget } from '../../ui-renderer-dom/event.js'

const documentVisibilityChange = fromEventTarget(document, 'visibilitychange')
const documentVisible = filter(() => document.visibilityState === 'visible', documentVisibilityChange)
const documentHidden = filter(() => document.visibilityState === 'hidden', documentVisibilityChange)

export const duringWindowActivity = <T>(source: IStream<T>) => {
  const sourceUntilInactivity = until(documentHidden, source)
  const activity = continueWith(
    (): IStream<T> => switchLatest(constant(activity, documentVisible)),
    sourceUntilInactivity
  )
  return activity
}

// `slottable.element` is the renderer-agnostic descriptor (`{ tag, namespace,
// native? }`). The DOM renderer writes the materialized element to
// `descriptor.native` at mount; PrimarySink delivers to the renderer first
// and the tether second, so by the time this resolver runs `.native` is
// populated. Pre-mount or non-DOM renderers fall through to `null`.
const resolveDomElement = (value: unknown): Element | null => {
  if (typeof Element === 'undefined' || value == null) return null
  if (value instanceof Element) return value
  const native = (value as { native?: unknown }).native
  return native instanceof Element ? native : null
}

export const intersection = (config: IntersectionObserverInit = {}) =>
  o(
    map(
      (slottable: ISlottable<Node>): IStream<IntersectionObserverEntry[]> =>
        fromCallback<IntersectionObserverEntry[], [IntersectionObserverEntry[]]>(
          cb => {
            const target = resolveDomElement(slottable.element)
            if (target === null || typeof IntersectionObserver === 'undefined') {
              return () => {}
            }
            const io = new IntersectionObserver(cb, config)
            io.observe(target)
            return () => io.disconnect()
          },
          entries => entries
        )
    ),
    switchLatest
  )

export const resize = (config: ResizeObserverOptions = {}) =>
  o(
    map(
      (slottable: ISlottable<Node>): IStream<ResizeObserverEntry[]> =>
        fromCallback<ResizeObserverEntry[], [ResizeObserverEntry[]]>(
          cb => {
            const target = resolveDomElement(slottable.element)
            if (target === null || typeof ResizeObserver === 'undefined') {
              return () => {}
            }
            const ro = new ResizeObserver(cb)
            ro.observe(target, config)
            return () => ro.disconnect()
          },
          entries => entries
        )
    ),
    switchLatest
  )

export const observer = {
  documentVisibilityChange,
  duringWindowActivity,
  intersection,
  resize
}
