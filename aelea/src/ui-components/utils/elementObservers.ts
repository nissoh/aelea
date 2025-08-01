import { eventElementTarget } from '../../core/combinator/event.js'
import { fromCallback } from '../../core/combinator/fromCallback.js'
import type { INode, INodeElement } from '../../core/source/node.js'
import {
  chain,
  constant,
  continueWith,
  filter,
  type IStream,
  switchLatest,
  until
} from '../../stream/index.js'

export const intersection = (config: IntersectionObserverInit = {}) =>
  chain(<A extends INodeElement>(node: INode<A>): IStream<IntersectionObserverEntry[]> =>
    fromCallback((cb) => {
      const intersectionObserver = new IntersectionObserver(cb, config)
      intersectionObserver.observe(node.element)
      return () => intersectionObserver.unobserve(node.element)
    })
  )

export const resize = (config: ResizeObserverOptions = {}) =>
  chain(<A extends INodeElement>(node: INode<A>): IStream<ResizeObserverEntry[]> =>
    fromCallback((cb) => {
      const ro = new ResizeObserver(cb)
      ro.observe(node.element, config)
      return () => ro.unobserve(node.element)
    })
  )

export const mutation = (
  config: MutationObserverInit = {
    attributes: true,
    childList: false,
    subtree: false
  }
) =>
  chain(<A extends INodeElement>(node: INode<A>): IStream<MutationRecord[]> =>
    fromCallback((cb) => {
      const mo = new MutationObserver(cb)
      mo.observe(node.element, config)
      return () => mo.disconnect()
    })
  )

const documentVisibilityChange = eventElementTarget('visibilitychange', document)
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

export const observer = {
  intersection,
  resize,
  mutation,
  documentVisibilityChange,
  duringWindowActivity
}
