import {
  constant,
  continueWith,
  filter,
  fromCallback,
  type IStream,
  map,
  o,
  switchLatest,
  until
} from '../../stream/index.js'
import { eventElementTarget } from '../../ui/combinator/event.js'
import type { INode } from '../../ui/types.js'

export const intersection = (config: IntersectionObserverInit = {}) => {
  return o(
    map((node: INode) =>
      fromCallback(
        cb => {
          const intersectionObserver = new IntersectionObserver(cb, config)
          intersectionObserver.observe(node.element)
          return () => intersectionObserver.unobserve(node.element)
        },
        (entries: IntersectionObserverEntry[]) => entries
      )
    ),
    switchLatest
  )
}

export const resize = (config: ResizeObserverOptions = {}) =>
  o(
    map((node: INode) =>
      fromCallback(
        cb => {
          const ro = new ResizeObserver(cb)
          ro.observe(node.element, config)
          return () => ro.unobserve(node.element)
        },
        (entries: ResizeObserverEntry[]) => entries
      )
    ),
    switchLatest
  )

export const mutation = (
  config: MutationObserverInit = {
    attributes: true,
    childList: false,
    subtree: false
  }
) =>
  o(
    map((node: INode) =>
      fromCallback(
        cb => {
          const mo = new MutationObserver(cb)
          mo.observe(node.element, config)
          return () => mo.disconnect()
        },
        (mutations: MutationRecord[]) => mutations
      )
    ),
    switchLatest
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
