import { curry2, disposeWith, type IStream, isStream } from '@/stream'
import { fromCallback, stream } from '@/stream-extended'
import type { EventDescriptor, I$Slottable } from '@/ui'

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

export function fromEventTarget<T extends EventTarget, K extends keyof EventMapFor<T> & string>(
  element: T,
  eventType: K,
  options: boolean | AddEventListenerOptions = false
): IStream<EventMapFor<T>[K]> {
  return fromCallback<EventMapFor<T>[K]>(cb => {
    element.addEventListener(eventType, cb as EventListener, options)

    return disposeWith(() => {
      element.removeEventListener(eventType, cb as EventListener, options)
    })
  })
}

type INodeEventDescriptor<T extends EventTarget> = {
  $node: I$Slottable<T>
  options?: boolean | AddEventListenerOptions
}

export interface INodeEventCurry {
  <T extends EventTarget, K extends keyof EventMapFor<T> & string>(
    eventType: K,
    descriptor: I$Slottable<T> | INodeEventDescriptor<T>
  ): IStream<EventMapFor<T>[K]>
  <T extends EventTarget, K extends keyof EventMapFor<T> & string>(
    eventType: K
  ): (descriptor: I$Slottable<T> | INodeEventDescriptor<T>) => IStream<EventMapFor<T>[K]>
}

export const nodeEvent: INodeEventCurry = curry2((eventType, descriptor) => {
  const target$ = isStream(descriptor) ? descriptor : descriptor.$node

  return stream((sink, scheduler) => {
    const disposable = target$.run(
      {
        event(_time: number, node: any) {
          const entry: EventDescriptor = { type: eventType, options: (descriptor as any).options, sinks: [sink] }
          node.events = [...(node.events ?? []), entry]
        },
        error(time: number, err: unknown) {
          sink.error(time, err)
        },
        end(time: number) {
          sink.end(time)
        }
      },
      scheduler
    )

    return disposeWith(() => {
      disposable?.[Symbol.dispose]?.()
    })
  })
})

// Custom listeners now belong in renderer code directly; no manifest hook needed.
