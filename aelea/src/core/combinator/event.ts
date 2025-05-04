import { chain } from '@most/core'
import { curry2 } from '@most/prelude'
import type { Stream } from '@most/types'
import type { INodeElement } from '../../core/types.js'
import { isStream } from '../common.js'
import type { I$Node } from '../source/node.js'

type PickEvent<A, B> = A extends keyof B ? B[A] : Event

type ElementEventList = DocumentEventMap &
  SVGElementEventMap &
  HTMLElementEventMap &
  WindowEventMap &
  IDBOpenDBRequestEventMap
type ElementEventNameList = keyof ElementEventList
type GuessByName<A extends ElementEventNameList> = ElementEventList[A]

type ElementEventTypeMap<A extends ElementEventNameList, B> = B extends Window
  ? PickEvent<A, WindowEventMap>
  : B extends HTMLElement
    ? PickEvent<A, DocumentEventMap>
    : B extends SVGAElement
      ? PickEvent<A, SVGElementEventMap>
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

type INodeEventDescriptor<B extends INodeElement> = {
  $node: I$Node<B>
  options: boolean | AddEventListenerOptions
}

export interface INodeEventCurry {
  <A extends ElementEventNameList, B extends INodeElement>(
    eventType: A,
    descriptor: I$Node<B> | INodeEventDescriptor<B>
  ): Stream<ElementEventTypeMap<A, B>>
  <A extends ElementEventNameList, B extends INodeElement>(
    eventType: A
  ): (descriptor: I$Node<B> | INodeEventDescriptor<B>) => Stream<ElementEventTypeMap<A, B>>
}

export const nodeEvent: INodeEventCurry = curry2((eventType, descriptor) => {
  if (isStream(descriptor)) {
    return chain((ns) => {
      return eventElementTarget(eventType, ns.element, { capture: true })
    }, descriptor)
  }

  return chain((ns) => {
    return eventElementTarget(eventType, ns.element, descriptor.options)
  }, descriptor.$node)
})
