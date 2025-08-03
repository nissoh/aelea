import type { ISink, IStream } from '../../stream/types.js'
import { toDisposable } from '../../stream/utils/disposable.js'
import { stream } from '../stream.js'

export const fromCallback = <T, FnArgs extends any[] = T[]>(
  callbackFunction: (cb: (...args: FnArgs) => any) => any,
  mapFn: (...args: FnArgs) => T = defaultMapFn as any,
  context: any = null
): IStream<T> =>
  stream((scheduler, sink) => {
    try {
      const maybeDisposable = callbackFunction.call(context, (...args: FnArgs) => {
        try {
          const value = mapFn(...args)
          sink.event(value)
        } catch (error) {
          sink.error(error)
        }
      })

      return toDisposable(maybeDisposable)
    } catch (error) {
      return scheduler.asap(sink, eventError, error)
    }
  })

function defaultMapFn<T>(...args: T[]): T {
  return args[0]
}

function eventError<T>(sink: ISink<T>, error: any): void {
  sink.error(error)
}
