import { disposeBoth, disposeWith, empty, type IStream, nullSink, stream, tap } from '../stream/index.js'

const readyStateMap: Record<number, string> = {
  [WebSocket.CONNECTING]: 'CONNECTING',
  [WebSocket.OPEN]: 'OPEN',
  [WebSocket.CLOSING]: 'CLOSING',
  [WebSocket.CLOSED]: 'CLOSED'
}

export function fromWebsocket<I, O>(
  url: string,
  input: IStream<O> = empty,
  protocols: string | string[] | undefined = undefined,
  options: {
    binaryType?: BinaryType
    maxBufferSize?: number
    connectionTimeout?: number
    serializer?: (data: O) => any
    deserializer?: (data: string) => I
  } = {}
): IStream<I> {
  return stream((sink, scheduler) => {
    let socket: WebSocket | null
    try {
      socket = new WebSocket(url, protocols)
    } catch (error) {
      sink.error(error)
      return disposeWith(() => {})
    }

    if (options.binaryType) {
      socket.binaryType = options.binaryType
    }

    const messageBuffer: O[] = []
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

      messageBuffer.length = 0
    }

    const onError = (error: Event) => {
      const errorMsg = error instanceof ErrorEvent ? error.message : 'WebSocket connection error'
      console.error(`[WebSocket] Error: ${errorMsg}`)
      cleanup()
      sink.error(new Error(`WebSocket error: ${errorMsg}`))
      sink.end()
    }

    const deserializer = options.deserializer ?? JSON.parse

    const onMessage = (msg: MessageEvent) => {
      if (isCleanedUp) return // Prevent processing after cleanup
      
      if (typeof msg.data === 'string') {
        try {
          const data = deserializer(msg.data)
          sink.event(data)
        } catch (parseError) {
          console.error(`[WebSocket] Parse error: ${parseError}`)
          cleanup()
          sink.error(new Error(`Parse error: ${parseError}`))
          sink.end()
        }
      } else {
        sink.event(msg.data as I)
      }
    }

    const serializer = options.serializer ?? JSON.stringify

    const sendMessage = (value: O) => {
      try {
        if (socket) {
          socket.send(serializer(value))
        }
      } catch (sendError) {
        console.warn('[WebSocket] Failed to send message:', sendError)
      }
    }

    const onOpen = () => {
      clearTimeout(timeoutId)
      while (messageBuffer.length > 0) {
        const message = messageBuffer.shift()!
        sendMessage(message)
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
        sink.end()
      }
    }

    socket.addEventListener('error', onError)
    socket.addEventListener('message', onMessage)
    socket.addEventListener('open', onOpen)
    socket.addEventListener('close', onClose)

    timeoutId = setTimeout(() => {
      if (!isCleanedUp && socket && socket.readyState === WebSocket.CONNECTING) {
        cleanup()
        sink.error(new Error('WebSocket connection timeout'))
        sink.end()
      }
    }, options.connectionTimeout ?? 5000)

    const sendInputEffect = tap((value: O) => {
      if (isCleanedUp) return // Prevent processing after cleanup
      
      if (socket && socket.readyState === WebSocket.OPEN) {
        sendMessage(value)
      } else if (socket && (socket.readyState === WebSocket.CONNECTING || socket.readyState === WebSocket.CLOSING)) {
        if (messageBuffer.length < (options.maxBufferSize ?? Number.POSITIVE_INFINITY)) {
          messageBuffer.push(value)
        } else {
          console.warn('[WebSocket] Buffer full, dropping message')
        }
      } else {
        console.warn(
          `[WebSocket] Cannot send message, socket state: ${socket ? readyStateMap[socket.readyState] : 'null'}`
        )
      }
    }, input).run(nullSink, scheduler)

    return disposeBoth(disposeWith(cleanup), sendInputEffect)
  })
}
