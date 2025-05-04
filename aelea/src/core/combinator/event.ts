import { chain } from '@most/core'
import { curry2 } from '@most/prelude'
import type { Stream } from '@most/types'
import { isStream } from '../common.js'
import type { I$Slot, INodeElement } from '../source/node.js'

type PickEvent<A, B> = A extends keyof B ? B[A] : Event

type INodeElementEventList = DocumentEventMap &
  SVGElementEventMap &
  HTMLElementEventMap &
  WindowEventMap &
  IDBOpenDBRequestEventMap
type INodeElementEventNameList = keyof INodeElementEventList
type GuessByName<A extends INodeElementEventNameList> = INodeElementEventList[A]

type INodeElementEventTypeMap<A extends INodeElementEventNameList, B> = B extends Window
  ? PickEvent<A, WindowEventMap>
  : B extends HTMLElement
    ? PickEvent<A, DocumentEventMap>
    : B extends SVGAElement
      ? PickEvent<A, SVGElementEventMap>
      : GuessByName<A>

export function eventElementTarget<A extends INodeElementEventNameList, B extends EventTarget>(
  eventType: A,
  element: B,
  options: boolean | AddEventListenerOptions = false
): Stream<INodeElementEventTypeMap<A, B>> {
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
  $node: I$Slot<B>
  options: boolean | AddEventListenerOptions
}

export interface INodeEventCurry {
  <A extends INodeElementEventNameList, B extends INodeElement>(
    eventType: A,
    descriptor: I$Slot<B> | INodeEventDescriptor<B>
  ): Stream<INodeElementEventTypeMap<A, B>>
  <A extends INodeElementEventNameList, B extends INodeElement>(
    eventType: A
  ): (descriptor: I$Slot<B> | INodeEventDescriptor<B>) => Stream<INodeElementEventTypeMap<A, B>>
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
