import { propagateErrorTask } from '../stream/scheduler/PropagateTask.js'
import type { IScheduler, ISink, IStream } from '../stream/types.js'
import { toDisposable } from '../stream/utils/disposable.js'

/**
 * Stream that creates values from a callback-based API
 */
class FromCallback<T, FnArgs extends any[] = T[]> implements IStream<T> {
  constructor(
    readonly callbackFunction: (cb: (...args: FnArgs) => any) => any,
    readonly mapFn: (...args: FnArgs) => T = defaultMapFn as any,
    readonly context: any = null
  ) {}

  run(sink: ISink<T>, scheduler: IScheduler): Disposable {
    try {
      const maybeDisposable = this.callbackFunction.call(this.context, (...args: FnArgs) => {
        try {
          const value = this.mapFn(...args)
          sink.event(scheduler.time(), value)
        } catch (error) {
          sink.error(scheduler.time(), error)
        }
      })

      return toDisposable(maybeDisposable)
    } catch (error) {
      return scheduler.asap(propagateErrorTask(sink, error))
    }
  }
}

/**
 * Create a stream from a callback-based API
 *
 * The callback function is invoked once and can emit multiple values over time.
 * Returns disposable/cleanup function if provided by the callback setup.
 *
 * Example with DOM events:
 * setup:    addEventListener('click', cb)
 * events:   ----c----c--c-------c--->
 * output:   ----e----e--e-------e--->
 *
 * Example with interval:
 * setup:    setInterval(cb, 3)
 * output:   ---x---x---x---x---x--->
 *
 * Example with WebSocket:
 * setup:    ws.onmessage = cb
 * messages: ------m-----m--m------>
 * output:   ------d-----d--d------>
 */
export const fromCallback = <T, FnArgs extends any[] = T[]>(
  callbackFunction: (cb: (...args: FnArgs) => any) => any,
  mapFn: (...args: FnArgs) => T = defaultMapFn as any,
  context: any = null
): IStream<T> => new FromCallback(callbackFunction, mapFn, context)

function defaultMapFn<T>(...args: T[]): T {
  return args[0]
}
