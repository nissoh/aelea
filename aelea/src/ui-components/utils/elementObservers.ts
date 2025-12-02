import type { INode } from '@/ui'
import { fromEventTarget } from '@/ui'
import { constant, continueWith, filter, type IStream, map, o, switchLatest, until } from '../../stream/index.js'
import { fromCallback } from '../../stream-extended/index.js'

const isDomElement = (element: unknown): element is Element =>
  typeof Element !== 'undefined' && element instanceof Element

export const intersection = (config: IntersectionObserverInit = {}) => {
  return o(
    map((node: INode) =>
      fromCallback(
        cb => {
          if (!isDomElement(node.element) || typeof IntersectionObserver === 'undefined') {
            return () => {}
          }

          const element = node.element as Element
          const intersectionObserver = new IntersectionObserver(cb, config)
          intersectionObserver.observe(element)
          return () => intersectionObserver.unobserve(element)
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
          if (!isDomElement(node.element) || typeof ResizeObserver === 'undefined') {
            return () => {}
          }

          const element = node.element as Element
          const ro = new ResizeObserver(cb)
          ro.observe(element, config)
          return () => ro.unobserve(element)
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
          if (!isDomElement(node.element) || typeof MutationObserver === 'undefined') {
            return () => {}
          }

          const element = node.element as Element
          const mo = new MutationObserver(cb)
          mo.observe(element, config)
          return () => mo.disconnect()
        },
        (mutations: MutationRecord[]) => mutations
      )
    ),
    switchLatest
  )

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

export const observer = {
  intersection,
  resize,
  mutation,
  documentVisibilityChange,
  duringWindowActivity
}
