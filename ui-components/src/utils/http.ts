import { eventElementTarget, nullSink } from "@aelea/core"
import { empty, tap, chain } from "@most/core"
import { disposeWith, disposeBoth } from "@most/disposable"
import { Stream } from "@most/types"

export function fromWebsocket<OUTPUT, INPUT>(url: string, input: Stream<INPUT> = empty(), protocols: string | string[] | undefined = undefined): Stream<OUTPUT> {
  return {
    run(sink, scheduler) {
      const socket = new WebSocket(url, protocols)

      const inputTap = tap(inputEvent => {
        socket.send(JSON.stringify(inputEvent))
      }, input)
      const inputS = chain(_ => inputTap, eventElementTarget('open' as any, socket))
        .run(nullSink, scheduler)

      socket.addEventListener("message", msg => {
        sink.event(scheduler.currentTime(), JSON.parse(msg.data))
      })

      const diposeSocket = disposeWith(s => s.close(), socket)

      return disposeBoth(diposeSocket, inputS)
    }
  }
}