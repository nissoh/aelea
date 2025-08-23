import { tap } from '../stream/combinator/tap.js'
import { propagateEndTask, propagateRunTask } from '../stream/scheduler/PropagateTask.js'
import type { IScheduler, ISink, IStream } from '../stream/types.js'
import { nullSink } from '../stream/utils/common.js'
import { disposeBoth, disposeNone, disposeWith } from '../stream/utils/disposable.js'

type WebSocketOptions<TSend, TReceive> = {
  input?: IStream<TSend>
  protocols?: string | string[]
  binaryType?: BinaryType
  maxBufferSize?: number
  connectionTimeout?: number
  onOpen?: (socket: WebSocket) => void
  serializer?: (data: TSend) => any
  deserializer?: (data: string) => TReceive
}

export function fromWebsocket<TReceive, TSend>(
  url: string,
  options: WebSocketOptions<TSend, TReceive> = {}
): IStream<TReceive> {
  return new FromWebSocket(url, options)
}

const readyStateMap: Record<number, string> = {
  [WebSocket.CONNECTING]: 'CONNECTING',
  [WebSocket.OPEN]: 'OPEN',
  [WebSocket.CLOSING]: 'CLOSING',
  [WebSocket.CLOSED]: 'CLOSED'
}

/**
 * Stream that creates a WebSocket connection and emits received messages
 */
class FromWebSocket<TReceive, TSend> implements IStream<TReceive> {
  constructor(
    readonly url: string,
    readonly options: WebSocketOptions<TSend, TReceive> = {}
  ) {}

  run(sink: ISink<TReceive>, scheduler: IScheduler): Disposable {
    // Check if WebSocket is available in runtime using globalThis
    const WebSocketConstructor = globalThis.WebSocket || (globalThis as any).WebSocket

    if (!WebSocketConstructor) {
      return scheduler.asap(
        propagateRunTask(sink, sink => {
          sink.error(new Error('WebSocket is not available in this environment'))
          sink.end()
        })
      )
    }

    let socket: WebSocket | null = new WebSocketConstructor(this.url, this.options.protocols)

    if (this.options.binaryType) {
      socket.binaryType = this.options.binaryType
    }

    const connectionStartTime = Date.now()

    // Declare timeout variable that will be assigned later
    // biome-ignore lint/style/useConst: timeoutId must be declared before cleanup function but assigned after event handlers
    let timeoutId: ReturnType<typeof setTimeout>

    const cleanup = () => {
      if (!socket) return

      clearTimeout(timeoutId)

      socket.removeEventListener('error', onError)
      socket.removeEventListener('message', onMessage)
      socket.removeEventListener('open', onOpen)
      socket.removeEventListener('close', onClose)

      if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
        socket.close()
      }
      socket = null
    }

    const onError = (error: Event) => {
      const errorMsg = error instanceof ErrorEvent ? error.message : 'WebSocket connection error'
      console.error(`[WebSocket] Error: ${errorMsg}`)
      cleanup()
      scheduler.asap(
        propagateRunTask(sink, sink => {
          sink.error(new Error(`WebSocket error: ${errorMsg}`))
          sink.end()
        })
      )
    }

    const deserializer = this.options.deserializer ?? JSON.parse

    const onMessage = (msg: MessageEvent) => {
      if (!socket) return // Prevent processing after cleanup

      if (typeof msg.data === 'string') {
        try {
          const data = deserializer(msg.data)
          sink.event(data)
        } catch (parseError) {
          console.error(`[WebSocket] Parse error: ${parseError}`)
          cleanup()
          scheduler.asap(
            propagateRunTask(sink, sink => {
              sink.error(new Error(`Parse error: ${parseError}`))
              sink.end()
            })
          )
        }
      } else {
        sink.event(msg.data as TReceive)
      }
    }

    const serializer = this.options.serializer ?? JSON.stringify

    const sendMessage = (value: TSend) => {
      try {
        if (socket) {
          socket.send(serializer(value))
        }
      } catch (sendError) {
        console.warn('[WebSocket] Failed to send message:', sendError)
      }
    }

    let sendInputEffect = disposeNone

    const onOpen = () => {
      clearTimeout(timeoutId)

      if (socket) {
        this.options.onOpen?.(socket)
      }

      if (this.options.input) {
        sendInputEffect = tap((value: TSend) => {
          if (!socket) return // Prevent processing after cleanup

          if (socket.readyState === WebSocket.OPEN) {
            sendMessage(value)
          } else {
            console.warn(`[WebSocket] Cannot send message, socket state: ${readyStateMap[socket.readyState]}`)
          }
        }, this.options.input).run(nullSink, scheduler)
      }
    }

    const onClose = (event: CloseEvent) => {
      if (!event.wasClean) {
        const connectionDuration = Date.now() - connectionStartTime
        const closeReason = event.reason || 'No reason provided'
        console.warn(
          `[WebSocket] Unclean connection close after ${connectionDuration}ms - Code: ${event.code}, Reason: ${closeReason}`
        )
      }

      if (socket) {
        cleanup()
        scheduler.asap(propagateEndTask(sink))
      }
    }

    socket.addEventListener('error', onError)
    socket.addEventListener('message', onMessage)
    socket.addEventListener('open', onOpen)
    socket.addEventListener('close', onClose)

    timeoutId = setTimeout(() => {
      if (socket && socket.readyState === WebSocket.CONNECTING) {
        cleanup()
        scheduler.asap(
          propagateRunTask(sink, sink => {
            sink.error(new Error('WebSocket connection timeout'))
            sink.end()
          })
        )
      }
    }, this.options.connectionTimeout ?? 5000)

    return disposeBoth(disposeWith(cleanup), sendInputEffect)
  }
}
