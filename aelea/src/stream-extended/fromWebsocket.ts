import {
  curry2,
  disposeNone,
  disposeWith,
  type IScheduler,
  type ISink,
  type IStream,
  nullSink,
  propagateEndTask,
  propagateErrorTask,
  type Time,
  tap
} from '../stream/index.js'

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

    const socket = createWebsocket()
    const connectionStartTime = scheduler.time()

    let disposed = false
    let sendInputEffect = disposeNone

    const timeoutId = setTimeout(() => {
      if (disposed) return

      if (socket.readyState === WebSocket.CONNECTING) {
        scheduler.asap(propagateErrorTask(sink, new Error('WebSocket connection timeout')))

        dispose()
      }
    }, delayTimeout)

    const onError = (error: Event) => {
      if (disposed) return

      const errorMessage = error instanceof ErrorEvent ? error.message : `WebSocket error: ${error.type}`
      sink.error(scheduler.time(), new Error(errorMessage))

      if (socket.readyState === WebSocket.CLOSED || socket.readyState === WebSocket.CLOSING) {
        dispose()
      }
    }

    const onMessage = (msg: MessageEvent) => {
      if (disposed) return

      try {
        sink.event(scheduler.time(), deserializer(msg.data))
      } catch (parseError) {
        sink.error(scheduler.time(), new Error(`Parse error: ${parseError}`))
      }
    }

    const onOpen = () => {
      if (disposed) return

      clearTimeout(timeoutId)

      if (this.input) {
        sendInputEffect = tap((value: I) => {
          if (disposed || socket.readyState !== WebSocket.OPEN) return

          try {
            socket.send(serializer(value))
          } catch (sendError) {
            sink.error(scheduler.time(), new Error(`WebSocket send error: ${sendError}`))
          }
        }, this.input).run(nullSink, scheduler)
      }
    }

    const onClose = (event: CloseEvent) => {
      if (disposed) return

      if (!event.wasClean) {
        const connectionDuration = scheduler.time() - connectionStartTime
        const closeReason = event.reason || 'No reason provided'

        sink.error(
          scheduler.time(),
          new Error(
            `WebSocket closed unexpectedly after ${connectionDuration}ms - Code: ${event.code}, Reason: ${closeReason}`
          )
        )
      }

      dispose()
    }

    const dispose = () => {
      if (disposed) return

      clearTimeout(timeoutId)

      socket.removeEventListener('error', onError)
      socket.removeEventListener('message', onMessage)
      socket.removeEventListener('open', onOpen)
      socket.removeEventListener('close', onClose)

      if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
        socket.close()
      }

      disposed = true

      sendInputEffect[Symbol.dispose]()

      scheduler.asap(propagateEndTask(sink))
    }

    socket.addEventListener('error', onError)
    socket.addEventListener('message', onMessage)
    socket.addEventListener('open', onOpen)
    socket.addEventListener('close', onClose)

    return disposeWith(dispose)
  }
}
