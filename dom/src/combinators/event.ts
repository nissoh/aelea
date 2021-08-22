import { join, map } from '@most/core'
import { curry2 } from '@most/prelude'
import { Stream } from '@most/types'
import { INodeElement, $Node } from '../types'

type PickEvent<A, B> = A extends keyof B ? B[A] : Event


type ElementEventList = DocumentEventMap & SVGElementEventMap & HTMLElementEventMap & WindowEventMap
type ElementEventNameList = keyof ElementEventList
type GuessByName<A extends ElementEventNameList> = ElementEventList[A]


type ElementEventTypeMap<A extends ElementEventNameList, B> =
  B extends Window ? PickEvent<A, WindowEventMap>
    : B extends HTMLElement ? PickEvent<A, DocumentEventMap>
      : B extends SVGAElement ? PickEvent<A, SVGElementEventMap>
        : GuessByName<A>



export function eventElementTarget<A extends ElementEventNameList, B extends EventTarget>(
  eventType: A,
  element: B,
  options: boolean | AddEventListenerOptions = false
): Stream<ElementEventTypeMap<A, B>> {
  return {
    run(sink, scheduler) {
      const cb = (e: any) => sink.event(scheduler.currentTime(), e)
      const removeListener = () => element.removeEventListener(eventType, cb, options)

      element.addEventListener(eventType, cb, options)

      return {
        dispose() {
          removeListener()
        }
      }
    }
  }
}


export interface NodeEvent {
  <A extends ElementEventNameList, B extends INodeElement>(eventType: A, node: $Node<B>): Stream<ElementEventTypeMap<A, B>>
  <A extends ElementEventNameList, B extends INodeElement>(eventType: A): (node: $Node<B>) => Stream<ElementEventTypeMap<A, B>>
}


export const event: NodeEvent = curry2((eventType, node) => {
  return join(
    map(ns => eventElementTarget(eventType, ns.element, { capture: true }), node)
  )
})


