import { tap } from '../stream/combinator/tap.js'
import { propagateEndTask, propagateRunTask } from '../stream/scheduler/PropagateTask.js'
import type { IScheduler, ISink, IStream } from '../stream/types.js'
import { nullSink } from '../stream/utils/common.js'
import { disposeBoth, disposeNone, disposeWith } from '../stream/utils/disposable.js'

const readyStateMap: Record<number, string> = {
  [WebSocket.CONNECTING]: 'CONNECTING',
  [WebSocket.OPEN]: 'OPEN',
  [WebSocket.CLOSING]: 'CLOSING',
  [WebSocket.CLOSED]: 'CLOSED'
}

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

/**
 * Stream that creates a WebSocket connection and emits received messages
 */
class FromWebSocket<TReceive, TSend> implements IStream<TReceive> {
  constructor(
    private readonly url: string,
    private readonly options: WebSocketOptions<TSend, TReceive> = {}
  ) {}

  run(sink: ISink<TReceive>, scheduler: IScheduler): Disposable {
    let socket: WebSocket | null
    try {
      socket = new WebSocket(this.url, this.options.protocols)
    } catch (error) {
      return scheduler.asap(
        propagateRunTask(sink, sink => {
          sink.error(error)
          sink.end()
        })
      )
    }

    if (this.options.binaryType) {
      socket.binaryType = this.options.binaryType
    }

    const connectionStartTime = Date.now()
    let isCleanedUp = false

    // Declare timeout variable that will be assigned later
    // biome-ignore lint/style/useConst: timeoutId must be declared before cleanup function but assigned after event handlers
    let timeoutId: ReturnType<typeof setTimeout>

    const cleanup = () => {
      if (isCleanedUp) return
      isCleanedUp = true

      clearTimeout(timeoutId)

      if (socket) {
        socket.removeEventListener('error', onError)
        socket.removeEventListener('message', onMessage)
        socket.removeEventListener('open', onOpen)
        socket.removeEventListener('close', onClose)

        if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
          socket.close()
        }
        socket = null
      }
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
      if (isCleanedUp) return // Prevent processing after cleanup

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

      this.options.onOpen?.(socket as WebSocket)

      if (this.options.input) {
        sendInputEffect = tap((value: TSend) => {
          if (isCleanedUp) return // Prevent processing after cleanup

          if (socket && socket.readyState === WebSocket.OPEN) {
            sendMessage(value)
          } else {
            console.warn(
              `[WebSocket] Cannot send message, socket state: ${socket ? readyStateMap[socket.readyState] : 'null'}`
            )
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

      if (!isCleanedUp) {
        cleanup()
        scheduler.asap(propagateEndTask(sink))
      }
    }

    socket.addEventListener('error', onError)
    socket.addEventListener('message', onMessage)
    socket.addEventListener('open', onOpen)
    socket.addEventListener('close', onClose)

    timeoutId = setTimeout(() => {
      if (!isCleanedUp && socket && socket.readyState === WebSocket.CONNECTING) {
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

export function fromWebsocket<TReceive, TSend>(
  url: string,
  options: WebSocketOptions<TSend, TReceive> = {}
): IStream<TReceive> {
  return new FromWebSocket(url, options)
}
