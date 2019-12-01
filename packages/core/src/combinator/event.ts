import {Stream, Sink, Scheduler} from '@most/types'

export class DomEvent<K extends keyof HTMLElementEventMap> implements Stream<HTMLElementEventMap[K]> {
  constructor(private eventType: K, private node: HTMLElement, private options?: boolean | AddEventListenerOptions) {}

  run(sink: Sink<Event>, scheduler: Scheduler) {
    const cb = (e: HTMLElementEventMap[K]) => sink.event(scheduler.currentTime(), e)

    const dispose = () => this.node.removeEventListener(this.eventType, cb, this.options)

    this.node.addEventListener(this.eventType, cb, this.options)

    return {dispose}
  }
}

export const domEvent = <K extends keyof HTMLElementEventMap>(eventType: K, node: HTMLElement, options = false) =>
  new DomEvent<K>(eventType, node, options)
