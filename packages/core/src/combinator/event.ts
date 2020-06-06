import { Stream, Sink, Scheduler } from '@most/types'
import { NodeStream } from '../types'
import { chain } from '@most/core'
import { curry2 } from '@most/prelude'
import { NodeType } from '../types'

type EventNames = keyof HTMLElementEventMap & keyof WindowEventMap & keyof SVGElementEventMap

type GuessByName<A extends EventNames> =
  HTMLElementEventMap[A] extends Event ? HTMLElementEventMap[A]
  : WindowEventMap[A] extends Event ? WindowEventMap[A]
  : SVGElementEventMap[A] extends Event ? SVGElementEventMap[A]
  : Event

type ElementEventTypeMap<A extends EventNames, B> =
  B extends Window ? WindowEventMap[A]
  : B extends HTMLElement ? DocumentEventMap[A]
  : B extends SVGAElement ? SVGElementEventMap[A]
  : GuessByName<A>


export interface NodeEventTarget {
  <A extends EventNames, B extends EventTarget>(eventType: A): (node: B, options?: boolean | AddEventListenerOptions) => Stream<ElementEventTypeMap<A, B>>
  <A extends EventNames, B extends EventTarget>(eventType: A, node: B, options?: boolean | AddEventListenerOptions): Stream<ElementEventTypeMap<A, B>>
}


export const eventTarget: NodeEventTarget = curry2((eventType, target, options = undefined) => {
  return {
    run(sink: Sink<Event>, scheduler: Scheduler) {
      const cb = (e: Event) => sink.event(scheduler.currentTime(), e)
      const dispose = () => target.removeEventListener(eventType, cb, options)

      target.addEventListener(eventType, cb, options)

      return { dispose }
    }
  }
})

export interface NodeEvent {
  <A extends EventNames, B extends NodeType, C, D>(eventType: A): (node: NodeStream<B, C, D>) => Stream<ElementEventTypeMap<A, B>>
  <A extends EventNames, B extends NodeType, C, D>(eventType: A, node: NodeStream<B, C, D>): Stream<ElementEventTypeMap<A, B>>
}



export const event: NodeEvent = curry2((eventType, node) => {
  return chain(ns => eventTarget(eventType, ns.node), node)
})


