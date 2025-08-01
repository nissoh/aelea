import { disposeAll, disposeBoth, disposeNone, disposeWith } from '../../stream/index.js'
import type { IStream } from '../../stream/types.js'

const defaultMapFn = <T>(...args: T[]): T => args[0]

export const fromCallback = <T, FnArgs extends any[] = T[]>(
  callbackFunction: (cb: (...args: FnArgs) => any) => any,
  mapFn: (...args: FnArgs) => T = defaultMapFn as any,
  context: any = null
): IStream<T> => ({
  run(scheduler, sink) {
    try {
      const scheduledTasks: Disposable[] = []

      // very common that callback functions returns a destructor, perhaps a Disposable in a "most" case
      const maybeDisposable = callbackFunction.call(context, (...args: FnArgs) => {
        const task = scheduler.asap(sink, (sink) => {
          try {
            const value = mapFn(...args)
            sink.event(value)
          } catch (error) {
            sink.error(error)
          }
        })
        scheduledTasks.push(task)
      })

      // Create composite disposable
      const callbackDisposable =
        maybeDisposable instanceof Function
          ? disposeWith(maybeDisposable)
          : maybeDisposable && typeof maybeDisposable === 'object' && Symbol.dispose in maybeDisposable
            ? maybeDisposable
            : disposeNone

      return disposeBoth(disposeAll(scheduledTasks), callbackDisposable)
    } catch (error) {
      const errorTask = scheduler.asap(sink, (sink) => sink.error(error))
      return errorTask
    }
  }
})
