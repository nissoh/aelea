import { eventElementTarget } from '../../core/combinator/event.js'
import type { INode, INodeElement } from '../../core/source/node.js'
import {
  chain,
  constant,
  continueWith,
  disposeWith,
  filter,
  type IStream,
  switchLatest,
  until
} from '../../stream/index.js'

export const intersection = (config: IntersectionObserverInit = {}) =>
  chain(
    <A extends INodeElement>(node: INode<A>): IStream<IntersectionObserverEntry[]> => ({
      run(scheduler, sink) {
        const intersectionObserver = new IntersectionObserver((entries) => {
          sink.event(entries)
        }, config)

        intersectionObserver.observe(node.element)

        return disposeWith(([instance, el]) => instance.unobserve(el), [intersectionObserver, node.element] as const)
      }
    })
  )

export const resize = (config: ResizeObserverOptions = {}) =>
  chain(
    <A extends INodeElement>(node: INode<A>): IStream<ResizeObserverEntry[]> => ({
      run(scheduler, sink) {
        const ro = new ResizeObserver((entries) => {
          sink.event(entries)
        })

        ro.observe(node.element, config)

        return disposeWith(([instance, el]) => instance.unobserve(el), [ro, node.element] as const)
      }
    })
  )

export const mutation = (
  config: MutationObserverInit = {
    attributes: true,
    childList: false,
    subtree: false
  }
) =>
  chain(
    <A extends INodeElement>(node: INode<A>): IStream<MutationRecord[]> => ({
      run(scheduler, sink) {
        const ro = new MutationObserver((entries) => {
          sink.event(entries)
        })

        ro.observe(node.element, config)

        return disposeWith((instance) => instance.disconnect(), ro)
      }
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
