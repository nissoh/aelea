import { eventElementTarget, IBranch, IBranchElement } from '@aelea/dom'
import { chain, constant, continueWith, filter, switchLatest, until } from "@most/core"
import { disposeWith } from "@most/disposable"
import { Stream } from "@most/types"




// https://github.com/microsoft/TypeScript-DOM-lib-generator/pull/948/files
declare interface ResizeObserverEntry {
  readonly borderBoxSize: ReadonlyArray<ResizeObserverSize>;
  readonly contentBoxSize: ReadonlyArray<ResizeObserverSize>;
  readonly contentRect: DOMRectReadOnly;
  readonly target: Element;
}

declare interface ResizeObserverSize {
  readonly blockSize: number;
  readonly inlineSize: number;
}


export const intersection = (config: IntersectionObserverInit = {}) => chain(<A extends IBranchElement>(node: IBranch<A>): Stream<IntersectionObserverEntry[]> => ({
  run(sink, scheduler) {

    const intersectionObserver = new IntersectionObserver(entries => {
      sink.event(scheduler.currentTime(), entries)
    }, config)

    intersectionObserver.observe(node.element)

    return disposeWith(([instance, el]) => instance.unobserve(el), [intersectionObserver, node.element] as const)
  }
}))

export const resize = (config: ResizeObserverOptions = {}) => chain(<A extends IBranchElement>(node: IBranch<A>): Stream<ResizeObserverEntry[]> => ({
  run(sink, scheduler) {

    const ro = new ResizeObserver(entries => {
      sink.event(scheduler.currentTime(), entries)
    })

    ro.observe(node.element, config)

    return disposeWith(([instance, el]) => instance.unobserve(el), [ro, node.element] as const)
  }
}))

export const mutation = (config: MutationObserverInit = { attributes: true, childList: false, subtree: false }) =>
  chain(<A extends IBranchElement>(node: IBranch<A>): Stream<MutationRecord[]> => ({
    run(sink, scheduler) {

      const ro = new MutationObserver(entries => {
        sink.event(scheduler.currentTime(), entries)
      })

      ro.observe(node.element, config)

      return disposeWith(instance => instance.disconnect(), ro)
    }
  }))


const documentVisibilityChange = eventElementTarget('visibilitychange', document)
const documentVisible = filter(() => document.visibilityState === 'visible', documentVisibilityChange)
const documentHidden = filter(() => document.visibilityState === 'hidden', documentVisibilityChange)


export const duringWindowActivity = <T>(source: Stream<T>) => {
  const sourceUntilInactivity = until(documentHidden, source)
  const activity = continueWith((): Stream<T> => switchLatest(constant(activity, documentVisible)), sourceUntilInactivity)
  return activity
}

