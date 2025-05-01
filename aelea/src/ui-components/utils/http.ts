import { chain, empty, tap } from '@most/core'
import { disposeBoth, disposeWith } from '@most/disposable'
import type { Stream } from '@most/types'
import { nullSink } from '../../core/common.js'
import { eventElementTarget } from '../../dom/combinators/event.js'

export function fromWebsocket<OUTPUT, INPUT>(
  url: string,
  input: Stream<INPUT> = empty(),
  protocols: string | string[] | undefined = undefined,
): Stream<OUTPUT> {
  return {
    run(sink, scheduler) {
      const socket = new WebSocket(url, protocols)

      const inputTap = tap((inputEvent) => {
        socket.send(JSON.stringify(inputEvent))
      }, input)
      const inputS = chain(
        (_) => inputTap,
        eventElementTarget('open' as any, socket),
      ).run(nullSink, scheduler)

      socket.addEventListener('message', (msg) => {
        sink.event(scheduler.currentTime(), JSON.parse(msg.data))
      })

      const diposeSocket = disposeWith((s) => s.close(), socket)

      return disposeBoth(diposeSocket, inputS)
    },
  }
}

export async function fetchJson<T>(
  input: RequestInfo,
  init: RequestInit & { parseJson?: (a: T) => T } = {},
): Promise<T> {
  const fetchResponse = await fetch(input, init)
  const { parseJson = (x) => x } = init
  const json = parseJson(await fetchResponse.json())
  return json
}
