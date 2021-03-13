import { INodeElement } from "@aelea/core";
import { disposeWith } from "@most/disposable";
import { Stream } from "@most/types";


export const fetchJson = async <T>(input: RequestInfo, init?: RequestInit): Promise<T> => (await fetch(input, init)).json()



export function intersectionObserverEvent<T extends HTMLElement>(el: T): Stream<IntersectionObserverEntry> {
  return {
    run(sink, scheduler) {

      const intersectionObserver = new IntersectionObserver(entries => {
        sink.event(scheduler.currentTime(), entries[0])
      });

      intersectionObserver.observe(el)

      return disposeWith(([instance, el]) => instance.unobserve(el), [intersectionObserver, el] as const)
    }
  }
}

export function resizeObserver<T extends Element>(el: T): Stream<ResizeObserverEntry[]> {
  return {
    run(sink, scheduler) {

      // @ts-ignore
      const ro = new ResizeObserver((entries: ResizeObserverEntry[]) => {
        sink.event(scheduler.currentTime(), entries)
      })

      ro.observe(el)

      return disposeWith(([instance, el]) => instance.unobserve(el), [ro, el] as const)
    }
  }
}

export function elementDisposedPromise<T extends INodeElement>(el: T): Promise<MutationRecord> {
  return new Promise((resolve) => {
    const ro = new MutationObserver((entries) => {
      const fst = entries[0]
      if (fst.removedNodes.length) {
        ro.disconnect()
        resolve(fst)
      }
    })
    ro.observe(el, { childList: true })
  })
}
