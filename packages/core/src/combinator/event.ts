import {Stream, Sink, Scheduler} from '@most/types'
import {NodeStream, DomNode} from '../types'
import {chain, map, merge} from '@most/core'
import {curry2} from '@most/prelude'
import {NodeType} from '../types'


export function eventTarget<E extends Event, N extends EventTarget>(eventType: string, target: N, options?: boolean | AddEventListenerOptions): Stream<E> {
  return {
    run(sink: Sink<Event>, scheduler: Scheduler) {
      const cb = (e: Event) => sink.event(scheduler.currentTime(), e)
      const dispose = () => target.removeEventListener(eventType, cb, options)

      target.addEventListener(eventType, cb, options)

      return {dispose}
    }
  }
}

// options?: boolean | AddEventListenerOptions

interface DomEvent {
  <A extends NodeType, B, C, D extends Event>(eventType: string): (node: NodeStream<A, B, C>) => Stream<D>
  <A extends NodeType, B, C, D extends Event>(eventType: string, node: NodeStream<A, B, C>): Stream<D>
}




const domEvent: DomEvent = curry2((eventType, node) => chain(ns => eventTarget(eventType, ns.node), node))


export {domEvent}
