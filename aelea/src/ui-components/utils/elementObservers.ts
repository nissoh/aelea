import { chain, constant, continueWith, filter, switchLatest, until } from '@most/core'
import { disposeWith } from '@most/disposable'
import { eventElementTarget } from '../../core/index.js'
import type { INode, INodeElement } from '../../core/source/node.js'

export const intersection = (config: IntersectionObserverInit = {}) =>
  chain(
    <A extends INodeElement>(node: INode<A>): IStream<IntersectionObserverEntry[]> => ({
      run(sink, scheduler) {
        const intersectionObserver = new IntersectionObserver((entries) => {
          sink.event(scheduler.currentTime(), entries)
        }, config)

        intersectionObserver.observe(node.element)

        return disposeWith(([instance, el]) => instance.unobserve(el), [intersectionObserver, node.element] as const)
      }
    })
  )

export const resize = (config: ResizeObserverOptions = {}) =>
  chain(
    <A extends INodeElement>(node: INode<A>): IStream<ResizeObserverEntry[]> => ({
      run(sink, scheduler) {
        const ro = new ResizeObserver((entries) => {
          sink.event(scheduler.currentTime(), entries)
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
      run(sink, scheduler) {
        const ro = new MutationObserver((entries) => {
          sink.event(scheduler.currentTime(), entries)
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
