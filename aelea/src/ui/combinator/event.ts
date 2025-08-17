import { curry2, disposeWith, fromCallback, type IStream, isStream, joinMap } from '../../stream/index.js'
import type { I$Slottable, INodeElement } from '../types.js'

type EventMapFor<T> = T extends Window
  ? WindowEventMap
  : T extends Document
    ? DocumentEventMap
    : T extends HTMLElement
      ? HTMLElementEventMap
      : T extends SVGElement
        ? SVGElementEventMap
        : T extends IDBOpenDBRequest
          ? IDBOpenDBRequestEventMap
          : T extends EventSource
            ? EventSourceEventMap
            : T extends WebSocket
              ? WebSocketEventMap
              : T extends XMLHttpRequest
                ? XMLHttpRequestEventMap
                : T extends Worker
                  ? WorkerEventMap
                  : T extends FileReader
                    ? FileReaderEventMap
                    : T extends AbortSignal
                      ? AbortSignalEventMap
                      : T extends Animation
                        ? AnimationEventMap
                        : T extends BroadcastChannel
                          ? BroadcastChannelEventMap
                          : T extends MessagePort
                            ? MessagePortEventMap
                            : GlobalEventHandlersEventMap

export function eventElementTarget<T extends EventTarget, K extends keyof EventMapFor<T> & string>(
  element: T,
  eventType: K,
  options: boolean | AddEventListenerOptions = false
): IStream<EventMapFor<T>[K]> {
  return fromCallback(cb => {
    element.addEventListener(eventType, cb as EventListener, options)

    return disposeWith(() => {
      element.removeEventListener(eventType, cb as EventListener, options)
    })
  })
}

type INodeEventDescriptor<B extends INodeElement> = {
  $node: I$Slottable<B>
  options: boolean | AddEventListenerOptions
}

export interface INodeEventCurry {
  <T extends INodeElement, K extends keyof EventMapFor<T> & string>(
    eventType: K,
    descriptor: I$Slottable<T> | INodeEventDescriptor<T>
  ): IStream<EventMapFor<T>[K]>
  <T extends INodeElement, K extends keyof EventMapFor<T> & string>(
    eventType: K
  ): (descriptor: I$Slottable<T> | INodeEventDescriptor<T>) => IStream<EventMapFor<T>[K]>
}

export const nodeEvent: INodeEventCurry = curry2((eventType, descriptor) => {
  if (isStream(descriptor)) {
    return joinMap(ns => {
      return eventElementTarget(ns.element, eventType, { capture: true })
    }, descriptor)
  }

  return joinMap(ns => {
    return eventElementTarget(ns.element, eventType, descriptor.options)
  }, descriptor.$node)
})
