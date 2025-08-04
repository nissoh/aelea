import { disposeBoth, disposeWith, empty, type IStream, nullSink, stream, tap } from '../../stream/index.js'

export function fromWebsocket<I, O>(
  url: string,
  input: IStream<O> = empty,
  protocols: string | string[] | undefined = undefined
): IStream<I> {
  return stream((sink, scheduler) => {
    let socket: WebSocket | null = new WebSocket(url, protocols)
    const messageBuffer: O[] = []

    const onError = (error: Event) => {
      const errorMsg = error instanceof ErrorEvent ? error.message : 'WebSocket connection error'
      sink.error(new Error(`WebSocket error: ${errorMsg}`))
    }

    const onMessage = (msg: MessageEvent) => {
      try {
        const data = JSON.parse(msg.data)
        sink.event(data)
      } catch (parseError) {
        sink.error(new Error(`JSON parse error: ${parseError}`))
      }
    }

    const sendMessage = (value: O) => {
      try {
        if (socket) {
          socket.send(JSON.stringify(value))
        }
      } catch (sendError) {
        console.warn('Failed to send WebSocket message:', sendError)
      }
    }

    const onOpen = () => {
      // Send any buffered messages
      while (messageBuffer.length > 0) {
        const message = messageBuffer.shift()!
        sendMessage(message)
      }
    }

    let isCleanedUp = false

    const onClose = () => {
      if (!isCleanedUp) {
        cleanup()
        sink.end()
      }
    }

    const cleanup = () => {
      if (isCleanedUp) return
      isCleanedUp = true

      if (socket) {
        // Remove all event listeners
        socket.removeEventListener('error', onError)
        socket.removeEventListener('message', onMessage)
        socket.removeEventListener('open', onOpen)
        socket.removeEventListener('close', onClose)

        // Clear socket reference
        socket = null
      }

      // Clear message buffer to free memory
      messageBuffer.length = 0
    }

    socket.addEventListener('error', onError)
    socket.addEventListener('message', onMessage)
    socket.addEventListener('open', onOpen)
    socket.addEventListener('close', onClose)

    // Handle input stream
    const sendInputEffect = tap((value: O) => {
      if (socket && socket.readyState === WebSocket.OPEN) {
        sendMessage(value)
      } else if (socket && socket.readyState === WebSocket.CONNECTING) {
        messageBuffer.push(value)
      }
    }, input).run(nullSink, scheduler)

    const disposeSocket = disposeWith(() => {
      cleanup()
      if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
        socket.close()
      }
    })

    return disposeBoth(disposeSocket, sendInputEffect)
  })
}
