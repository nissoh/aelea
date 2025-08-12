import type { IScheduler, ISink, IStream } from '../../stream/types.js'
import { toDisposable } from '../../stream/utils/disposable.js'
import { propagateErrorTask } from '../scheduler/PropagateTask.js'

/**
 * Stream that creates values from a callback-based API
 */
class FromCallback<T, FnArgs extends any[] = T[]> implements IStream<T> {
  constructor(
    private readonly callbackFunction: (cb: (...args: FnArgs) => any) => any,
    private readonly mapFn: (...args: FnArgs) => T = defaultMapFn as any,
    private readonly context: any = null
  ) {}

  run(sink: ISink<T>, scheduler: IScheduler): Disposable {
    try {
      const maybeDisposable = this.callbackFunction.call(this.context, (...args: FnArgs) => {
        try {
          const value = this.mapFn(...args)
          sink.event(value)
        } catch (error) {
          sink.error(error)
        }
      })

      return toDisposable(maybeDisposable)
    } catch (error) {
      return scheduler.asap(propagateErrorTask(sink, error))
    }
  }
}

export const fromCallback = <T, FnArgs extends any[] = T[]>(
  callbackFunction: (cb: (...args: FnArgs) => any) => any,
  mapFn: (...args: FnArgs) => T = defaultMapFn as any,
  context: any = null
): IStream<T> => new FromCallback(callbackFunction, mapFn, context)

function defaultMapFn<T>(...args: T[]): T {
  return args[0]
}
