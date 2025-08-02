import type { IStream } from '../../stream/index.js'
import { chain, curry2, fromCallback, isStream } from '../../stream/index.js'
import type { I$Slottable, INodeElement } from '../types.js'

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
): IStream<INodeElementEventTypeMap<A, B>> {
  return fromCallback((cb) => {
    element.addEventListener(eventType, cb as EventListener, options)

    return () => {
      element.removeEventListener(eventType, cb as EventListener, options)
    }
  })
}

type INodeEventDescriptor<B extends INodeElement> = {
  $node: I$Slottable<B>
  options: boolean | AddEventListenerOptions
}

export interface INodeEventCurry {
  <A extends INodeElementEventNameList, B extends INodeElement>(
    eventType: A,
    descriptor: I$Slottable<B> | INodeEventDescriptor<B>
  ): IStream<INodeElementEventTypeMap<A, B>>
  <A extends INodeElementEventNameList, B extends INodeElement>(
    eventType: A
  ): (descriptor: I$Slottable<B> | INodeEventDescriptor<B>) => IStream<INodeElementEventTypeMap<A, B>>
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
