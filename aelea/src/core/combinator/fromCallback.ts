import { disposeAll, disposeBoth, stream } from '../../stream/index.js'
import type { ISink, IStream } from '../../stream/types.js'
import { toDisposable } from '../../stream/utils/disposable.js'

const defaultMapFn = <T>(...args: T[]): T => args[0]

export const fromCallback = <T, FnArgs extends any[] = T[]>(
  callbackFunction: (cb: (...args: FnArgs) => any) => any,
  mapFn: (...args: FnArgs) => T = defaultMapFn as any,
  context: any = null
): IStream<T> =>
  stream((scheduler, sink) => {
    try {
      const scheduledTasks: Disposable[] = []

      // very common that callback functions returns a destructor, perhaps a Disposable in a "most" case
      const maybeDisposable = callbackFunction.call(context, (...args: FnArgs) => {
        const task = scheduler.asap(sink, eventTryMap, mapFn, ...args)
        scheduledTasks.push(task)
      })

      return disposeBoth(
        disposeAll(scheduledTasks), //
        toDisposable(maybeDisposable)
      )
    } catch (error) {
      return scheduler.asap(sink, eventError, error)
    }
  })

function eventTryMap<T, FnArgs extends any[]>(sink: ISink<T>, mapFn: (...args: FnArgs) => T, ...args: FnArgs): void {
  try {
    const value = mapFn(...args)
    sink.event(value)
  } catch (error) {
    sink.error(error)
  }
}

function eventError<T>(sink: ISink<T>, error: any): void {
  sink.error(error)
}
