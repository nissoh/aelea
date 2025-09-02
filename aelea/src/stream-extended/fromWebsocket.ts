import {
  curry2,
  disposeNone,
  disposeWith,
  type IScheduler,
  type ISink,
  type IStream,
  nullSink,
  propagateEndTask,
  type Time,
  tap
} from '../stream/index.js'
import { propagateErrorEndTask } from '../stream/scheduler/PropagateTask.js'

type WebSocketOptions<I, O> = {
  url: string
  delayTimeout?: Time

  createWebsocket?: () => WebSocket
  serializer?: (data: I) => any
  deserializer?: (data: any) => O
}

interface IFromWebsocketCurry {
  <I, O>(options: WebSocketOptions<I, O>, input: IStream<I>): IStream<O>
  <I, O>(options: WebSocketOptions<I, O>): (input: IStream<I>) => IStream<O>
}
export const fromWebsocket: IFromWebsocketCurry = curry2((options, input) => new FromWebSocket(options, input))

/**
 * Stream that creates a WebSocket connection and emits received messages
 */
class FromWebSocket<I, O> implements IStream<O> {
  constructor(
    readonly options: WebSocketOptions<I, O>,
    readonly input: IStream<I>
  ) {}

  run(sink: ISink<O>, scheduler: IScheduler): Disposable {
    const {
      url,
      delayTimeout = 5000,
      createWebsocket = () => new globalThis.WebSocket(url),
      serializer = this.options.serializer ?? JSON.stringify,
      deserializer = this.options.deserializer ?? JSON.parse
    } = this.options

    let socket: WebSocket
    try {
      socket = createWebsocket()
    } catch (error) {
      scheduler.asap(propagateErrorEndTask(sink, new Error(`Failed to create WebSocket: ${error}`)))
      return disposeNone
    }

    const connectionStartTime = scheduler.time()

    let disposed = false
    let sendInputEffect = disposeNone

    const timeoutId = setTimeout(() => {
      if (disposed) return

      if (socket.readyState === WebSocket.CONNECTING) {
        cleanup()

        scheduler.asap(propagateErrorEndTask(sink, new Error('WebSocket connection timeout')))
      }
    }, delayTimeout)

    const onError = (error: Event) => {
      if (disposed) return

      const errorMessage = error instanceof ErrorEvent ? error.message : `WebSocket error: ${error.type}`
      cleanup()

      scheduler.asap(propagateErrorEndTask(sink, new Error(`WebSocket connection error: ${errorMessage}`)))
    }

    const onMessage = (msg: MessageEvent) => {
      if (disposed) return

      try {
        sink.event(scheduler.time(), deserializer(msg.data))
      } catch (parseError) {
        // Emit error but don't close the connection - bad message shouldn't kill the stream
        sink.error(scheduler.time(), new Error(`Parse error: ${parseError}`))
      }
    }

    const onOpen = () => {
      if (disposed) return

      clearTimeout(timeoutId)

      if (this.input && !disposed) {
        sendInputEffect = tap((value: I) => {
          if (disposed || socket.readyState !== WebSocket.OPEN) return

          try {
            const serialized = serializer(value)
            socket.send(serialized)
          } catch (sendError) {
            // Emit error but don't close the connection
            sink.error(scheduler.time(), new Error(`WebSocket send error: ${sendError}`))
          }
        }, this.input).run(nullSink, scheduler)
      }
    }

    const onClose = (event: CloseEvent): void => {
      if (disposed) return

      cleanup()

      if (event.wasClean) {
        scheduler.asap(propagateEndTask(sink))

        return
      }

      const connectionDuration = scheduler.time() - connectionStartTime
      const closeReason = event.reason || 'No reason provided'

      scheduler.asap(
        propagateErrorEndTask(
          sink,
          new Error(
            `WebSocket closed unexpectedly - Code: ${event.code}, Reason: ${closeReason}, Duration: ${connectionDuration}ms`
          )
        )
      )
    }

    const cleanup = () => {
      if (disposed) return
      disposed = true

      clearTimeout(timeoutId)

      socket.removeEventListener('error', onError)
      socket.removeEventListener('message', onMessage)
      socket.removeEventListener('open', onOpen)
      socket.removeEventListener('close', onClose)

      sendInputEffect[Symbol.dispose]()

      if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
        socket.close()
      }
    }

    socket.addEventListener('error', onError)
    socket.addEventListener('message', onMessage)
    socket.addEventListener('open', onOpen)
    socket.addEventListener('close', onClose)

    return disposeWith(cleanup)
  }
}
