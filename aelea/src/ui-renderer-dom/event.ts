import { curry2, disposeWith, type IStream, isStream } from '@/stream'
import { fromCallback, stream } from '@/stream-extended'
import type { I$Slottable } from './types.js'

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

type INodeEventDescriptor<T extends Node = Node> = {
  $node: I$Slottable<T>
  options?: boolean | AddEventListenerOptions
}

export interface INodeEventCurry {
  <T extends Node, K extends keyof EventMapFor<T> & string>(
    eventType: K,
    descriptor: I$Slottable<T> | INodeEventDescriptor<T>
  ): IStream<EventMapFor<T>[K]>
  <T extends Node, K extends keyof EventMapFor<T> & string>(
    eventType: K
  ): (descriptor: I$Slottable<T> | INodeEventDescriptor<T>) => IStream<EventMapFor<T>[K]>
}

export const nodeEvent: INodeEventCurry = curry2((eventType, descriptor) => {
  const target$ = isStream(descriptor) ? descriptor : descriptor.$node

  return stream((sink, scheduler) => {
    let detach: Disposable | null = null

    const disposable = target$.run(
      {
        event(_time: number, node: any) {
          detach?.[Symbol.dispose]?.()
          const target = (node as any)?.element ?? node
          if (!target?.addEventListener) return

          const handler = (ev: Event) => {
            sink.event(scheduler.time(), ev as any)
          }

          target.addEventListener(eventType, handler as EventListener, (descriptor as any).options)
          detach = disposeWith(() => {
            target.removeEventListener(eventType, handler as EventListener, (descriptor as any).options)
          })
        },
        error(time: number, err: unknown) {
          sink.error(time, err)
        },
        end(time: number) {
          detach?.[Symbol.dispose]?.()
          sink.end(time)
        }
      },
      scheduler
    )

    return disposeWith(() => {
      detach?.[Symbol.dispose]?.()
      disposable?.[Symbol.dispose]?.()
    })
  })
})

// Custom listeners now belong in renderer code directly; no manifest hook needed.
