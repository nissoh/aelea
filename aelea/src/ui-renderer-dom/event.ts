import {
  curry2,
  disposeBoth,
  disposeNone,
  disposeWith,
  type IScheduler,
  type ISink,
  type IStream,
  type ITime,
  isStream
} from '../stream/index.js'
import { fromCallback } from '../stream-extended/index.js'
import type { I$Slottable, ISlotChild } from '../ui/types.js'

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

type INodeEventDescriptor = {
  $node: I$Slottable
  options?: boolean | AddEventListenerOptions
}

export interface INodeEventCurry {
  <K extends keyof GlobalEventHandlersEventMap & string>(
    eventType: K,
    descriptor: I$Slottable | INodeEventDescriptor
  ): IStream<GlobalEventHandlersEventMap[K]>
  <K extends keyof GlobalEventHandlersEventMap & string>(
    eventType: K
  ): (descriptor: I$Slottable | INodeEventDescriptor) => IStream<GlobalEventHandlersEventMap[K]>
}

/**
 * Events of the element a node mounts to. Listens from the moment the mount
 * port resolves, moves to the next node's element on re-emission, and
 * detaches with the subscription. Text children never yield a target, and
 * the node stream ending does not end the events.
 */
export const nodeEvent: INodeEventCurry = curry2((eventType, descriptor) => {
  const $node = isStream(descriptor) ? descriptor : descriptor.$node
  const options = isStream(descriptor) ? undefined : descriptor.options
  return new NodeEvent($node, eventType, options)
})

class NodeEvent implements IStream<Event> {
  constructor(
    readonly $node: I$Slottable,
    readonly eventType: string,
    readonly options: boolean | AddEventListenerOptions | undefined
  ) {}

  run(sink: ISink<Event>, scheduler: IScheduler): Disposable {
    const listener = new NodeEventSink(sink, scheduler, this.eventType, this.options)
    return disposeBoth(this.$node.run(listener, scheduler), listener)
  }
}

class NodeEventSink implements ISink<ISlotChild>, Disposable {
  private target: EventTarget | null = null
  private port: Disposable = disposeNone

  constructor(
    readonly sink: ISink<Event>,
    readonly scheduler: IScheduler,
    readonly eventType: string,
    readonly options: boolean | AddEventListenerOptions | undefined
  ) {}

  event(_time: ITime, child: ISlotChild): void {
    this.port[Symbol.dispose]()
    this.port = disposeNone
    if (child !== null && child.kind === 'node') this.port = child.mount.onElement(this.attach)
  }

  error(time: ITime, err: unknown): void {
    this.sink.error(time, err)
  }

  end(): void {}

  [Symbol.dispose](): void {
    this.port[Symbol.dispose]()
    this.port = disposeNone
    this.detach()
  }

  private attach = (element: unknown): void => {
    this.detach()
    if (element === null || typeof (element as EventTarget).addEventListener !== 'function') return
    const target = element as EventTarget
    target.addEventListener(this.eventType, this.listener, this.options)
    this.target = target
  }

  private listener = (event: Event): void => {
    this.sink.event(this.scheduler.time(), event)
  }

  private detach(): void {
    const target = this.target
    if (target === null) return
    this.target = null
    target.removeEventListener(this.eventType, this.listener, this.options)
  }
}
