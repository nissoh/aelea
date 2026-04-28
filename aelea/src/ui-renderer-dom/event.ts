import { curry2, disposeWith, type IStream, isStream } from '../stream/index.js'
import { fromCallback, stream } from '../stream-extended/index.js'
import type { I$Slottable } from '../ui/types.js'

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

/**
 * Descriptor form for `nodeEvent` when the caller needs extra options.
 * Accepts any slottable because the renderer-agnostic `INode` carries an
 * element descriptor, not a Node; `nodeEvent` walks to the real DOM node
 * at runtime via the `native` descriptor field or the materialized
 * element that the renderer writes back during mount.
 */
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

// Walk from an aelea `INode` (or a raw element) to something we can attach
// an event listener on. The renderer-agnostic `INode.element` is an
// `IElementDescriptor`; the DOM renderer stores the materialized element
// in `descriptor.native` at mount, and `$wrapNativeElement` sets it at
// construction. Either path yields a real DOM Element we can bind events to.
function resolveEventTarget(value: unknown): EventTarget | null {
  if (value === null || value === undefined) return null
  if (typeof (value as EventTarget).addEventListener === 'function') return value as EventTarget
  const el = (value as { element?: unknown }).element
  if (el && typeof (el as EventTarget).addEventListener === 'function') return el as EventTarget
  const native = (el as { native?: unknown })?.native ?? (value as { native?: unknown }).native
  if (native && typeof (native as EventTarget).addEventListener === 'function') return native as EventTarget
  return null
}

export const nodeEvent: INodeEventCurry = curry2((eventType, descriptor) => {
  const target$ = isStream(descriptor) ? descriptor : descriptor.$node
  const options = isStream(descriptor) ? undefined : descriptor.options

  return stream((sink, scheduler) => {
    let detach: Disposable | null = null

    const disposable = target$.run(
      {
        event(_time: number, node: unknown) {
          detach?.[Symbol.dispose]?.()
          const target = resolveEventTarget(node)
          if (target === null) return

          const handler = (ev: Event) => {
            sink.event(scheduler.time(), ev as never)
          }

          target.addEventListener(eventType, handler, options)
          detach = disposeWith(() => {
            target.removeEventListener(eventType, handler, options)
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
