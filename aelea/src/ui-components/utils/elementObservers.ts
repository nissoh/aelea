import { eventElementTarget } from '../../core/index.js'
import type { INode, INodeElement } from '../../core/source/node.js'
import type { IStream } from '../../stream/index.js'
import { chain, constant, continueWith, disposeWith, filter, switchLatest, until } from '../../stream/index.js'

export const intersection = (config: IntersectionObserverInit = {}) =>
  chain(
    <A extends INodeElement>(node: INode<A>): IStream<IntersectionObserverEntry[]> =>
      (scheduler, sink) => {
        const intersectionObserver = new IntersectionObserver((entries) => {
          sink.event(entries)
        }, config)

        intersectionObserver.observe(node.element)

        return disposeWith(([instance, el]: readonly [IntersectionObserver, Element]) => instance.unobserve(el), [
          intersectionObserver,
          node.element
        ] as const)
      }
  )

export const resize = (config: ResizeObserverOptions = {}) =>
  chain(
    <A extends INodeElement>(node: INode<A>): IStream<ResizeObserverEntry[]> =>
      (scheduler, sink) => {
        const ro = new ResizeObserver((entries) => {
          sink.event(entries)
        })

        ro.observe(node.element, config)

        return disposeWith(([instance, el]: readonly [ResizeObserver, Element]) => instance.unobserve(el), [
          ro,
          node.element
        ] as const)
      }
  )

export const mutation = (
  config: MutationObserverInit = {
    attributes: true,
    childList: false,
    subtree: false
  }
) =>
  chain(
    <A extends INodeElement>(node: INode<A>): IStream<MutationRecord[]> =>
      (scheduler, sink) => {
        const ro = new MutationObserver((entries) => {
          sink.event(entries)
        })

        ro.observe(node.element, config)

        return disposeWith((instance: MutationObserver) => instance.disconnect(), ro)
      }
  )

const documentVisibilityChange = eventElementTarget('visibilitychange', document) as IStream<Event>
const documentVisible = filter<Event>(() => document.visibilityState === 'visible')(documentVisibilityChange)
const documentHidden = filter<Event>(() => document.visibilityState === 'hidden')(documentVisibilityChange)

export const duringWindowActivity = <T>(source: IStream<T>): IStream<T> => {
  const sourceUntilInactivity = until<T, Event>(documentHidden)(source)
  const activity: IStream<T> = continueWith<T>(
    (): IStream<T> => switchLatest(constant<IStream<T>, Event>(activity)(documentVisible))
  )(sourceUntilInactivity)
  return activity
}

export const observer = {
  intersection,
  resize,
  mutation,
  documentVisibilityChange,
  duringWindowActivity
}
