import type { ISink, IStream } from '../../stream/types.js'
import { toDisposable } from '../../stream/utils/disposable.js'
import { stream } from '../stream.js'

export const fromCallback = <T, FnArgs extends any[] = T[]>(
  callbackFunction: (cb: (...args: FnArgs) => any) => any,
  mapFn: (...args: FnArgs) => T = defaultMapFn as any,
  context: any = null
): IStream<T> =>
  stream((sink, scheduler) => {
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
      return scheduler.asap(eventError, error, sink)
    }
  })

function defaultMapFn<T>(...args: T[]): T {
  return args[0]
}

function eventError<T>(error: any, sink: ISink<T>): void {
  sink.error(error)
}
