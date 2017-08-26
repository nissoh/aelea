import { Stream, Sink, Scheduler } from '@most/types'

export class DomEvent<T extends Event> implements Stream<T> {
  constructor (private name: string, private node: EventTarget, private capture: boolean) {}

  run (sink: Sink<T>, scheduler: Scheduler) {
    const cb = (ev: T) => sink.event(scheduler.now(), ev)
    const dispose = () => this.node.removeEventListener(this.name, cb, this.capture)

    this.node.addEventListener(this.name, cb, this.capture)

    return { dispose }
  }
}

