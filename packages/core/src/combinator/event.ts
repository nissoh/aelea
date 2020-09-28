import { join, map } from '@most/core'
import { curry2 } from '@most/prelude'
import { Scheduler, Sink, Stream } from '@most/types'
import { NodeType, NodeStream } from '../types'

type PickEvent<A, B> = A extends keyof B ? B[A] : Event


type ElementEventList = DocumentEventMap & SVGElementEventMap & HTMLElementEventMap & WindowEventMap
type ElementEventNameList = keyof ElementEventList
type GuessByName<A extends ElementEventNameList> = ElementEventList[A]


type ElementEventTypeMap<A extends ElementEventNameList, B> =
  B extends Window ? PickEvent<A, WindowEventMap>
  : B extends HTMLElement ? PickEvent<A, DocumentEventMap>
  : B extends SVGAElement ? PickEvent<A, SVGElementEventMap>
  : GuessByName<A>


export interface NodeEventTarget {
  <A extends ElementEventNameList, B extends EventTarget>(eventType: A): (node: B, options?: boolean | AddEventListenerOptions) => Stream<ElementEventTypeMap<A, B>>
  <A extends ElementEventNameList, B extends EventTarget>(eventType: A, node: B, options?: boolean | AddEventListenerOptions): Stream<ElementEventTypeMap<A, B>>
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
  <A extends ElementEventNameList, B extends NodeType, C, D>(eventType: A): (node: NodeStream<B, C, D>) => Stream<ElementEventTypeMap<A, B>>
  <A extends ElementEventNameList, B extends NodeType, C, D>(eventType: A, node: NodeStream<B, C, D>): Stream<ElementEventTypeMap<A, B>>
}


export const event: NodeEvent = curry2((eventType, node) => {
  return join(
    map(ns => eventTarget(eventType, ns.element), node)
  )
})


