import { disposeBoth, disposeWith, empty, type IStream, nullSink, tap } from '../../stream/index.js'

export function fromWebsocket<OUTPUT, INPUT>(
  url: string,
  input: IStream<INPUT> = empty,
  protocols: string | string[] | undefined = undefined
): IStream<OUTPUT> {
  return {
    run(scheduler, sink) {
      let socket: WebSocket | null = new WebSocket(url, protocols)
      const messageBuffer: INPUT[] = []

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

      const sendMessage = (value: INPUT) => {
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
      const sendInputEffect = tap((value: INPUT) => {
        if (socket && socket.readyState === WebSocket.OPEN) {
          sendMessage(value)
        } else if (socket && socket.readyState === WebSocket.CONNECTING) {
          messageBuffer.push(value)
        }
      }, input).run(scheduler, nullSink)

      const disposeSocket = disposeWith(() => {
        cleanup()
        if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
          socket.close()
        }
      }, {})

      return disposeBoth(disposeSocket, sendInputEffect)
    }
  }
}

export async function fetchJson<T>(
  input: RequestInfo,
  init: RequestInit & { parseJson?: (a: T) => T } = {}
): Promise<T> {
  const fetchResponse = await fetch(input, init)
  const { parseJson = (x) => x } = init
  const json = parseJson(await fetchResponse.json())
  return json
}
