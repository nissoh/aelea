import { eventElementTarget } from '../../core/combinator/event.js'
import type { IStream } from '../../stream/index.js'
import { chain, disposeBoth, disposeWith, empty, nullSink, tap } from '../../stream/index.js'

export function fromWebsocket<OUTPUT, INPUT>(
  url: string,
  input: IStream<INPUT> = empty as IStream<INPUT>,
  protocols: string | string[] | undefined = undefined
): IStream<OUTPUT> {
  return (scheduler, sink) => {
    const socket = new WebSocket(url, protocols)

    const inputTap = tap<INPUT>((inputEvent) => {
      socket.send(JSON.stringify(inputEvent))
    })(input)

    const openStream = eventElementTarget('open' as any, socket) as IStream<Event>
    const inputS = chain<Event, INPUT>((_) => inputTap)(openStream)(scheduler, nullSink)

    socket.addEventListener('message', (msg) => {
      sink.event(JSON.parse(msg.data))
    })

    const disposeSocket = disposeWith((s: WebSocket) => s.close(), socket)

    return disposeBoth(disposeSocket, inputS)
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
