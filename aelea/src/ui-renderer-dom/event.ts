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
    let portSub: Disposable | null = null
    let currentTarget: EventTarget | null = null

    const attach = (target: EventTarget | null) => {
      if (target === currentTarget) return

      detach?.[Symbol.dispose]?.()
      detach = null
      currentTarget = target
      if (target === null) return

      const handler = (ev: Event) => {
        sink.event(scheduler.time(), ev as never)
      }

      target.addEventListener(eventType, handler, options)
      detach = disposeWith(() => {
        target.removeEventListener(eventType, handler, options)
      })
    }

    const disposable = target$.run(
      {
        event(_time: number, node: unknown) {
          portSub?.[Symbol.dispose]?.()
          portSub = null

          // Prefer the typed mount handshake: the port fires at resolution
          // (immediately when already mounted), removing the dependency on
          // sink-delivery ordering and the `element.native` duck-walk.
          const mount = (node as { mount?: { onElement?: (cb: (el: unknown) => void) => Disposable } })?.mount
          if (mount && typeof mount.onElement === 'function') {
            portSub = mount.onElement(el => {
              attach(resolveEventTarget(el))
            })
            if (currentTarget === null) {
              // Unresolved port (no renderer will resolve a directly-subscribed
              // manifest): fall through to the legacy duck-walk, which still
              // finds a pre-set native element ($wrapNativeElement).
              const target = resolveEventTarget(node)
              if (target !== null) attach(target)
            }
            return
          }

          attach(resolveEventTarget(node))
        },
        error(time: number, err: unknown) {
          sink.error(time, err)
        },
        end(time: number) {
          portSub?.[Symbol.dispose]?.()
          portSub = null
          detach?.[Symbol.dispose]?.()
          sink.end(time)
        }
      },
      scheduler
    )

    return disposeWith(() => {
      portSub?.[Symbol.dispose]?.()
      detach?.[Symbol.dispose]?.()
      disposable?.[Symbol.dispose]?.()
    })
  })
})

// Custom listeners now belong in renderer code directly; no manifest hook needed.
