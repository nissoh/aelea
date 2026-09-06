import { propagateErrorEndTask } from '../../stream/scheduler/PropagateTask.js'
import type { IScheduler, ISink, IStream } from '../../stream/types.js'
import { toDisposable } from '../../stream/utils/disposable.js'
import { tryEvent } from '../../stream/utils/sink.js'

class FromCallback<T, FnArgs extends any[] = T[]> implements IStream<T> {
  constructor(
    readonly callbackFunction: (cb: (...args: FnArgs) => any) => any,
    readonly mapFn: (...args: FnArgs) => T = defaultMapFn as any,
    readonly context: any = null
  ) {}

  run(sink: ISink<T>, scheduler: IScheduler): Disposable {
    try {
      const maybeDisposable = this.callbackFunction.call(this.context, (...args: FnArgs) => {
        const time = scheduler.time()
        let value: T
        try {
          value = this.mapFn(...args)
        } catch (error) {
          sink.error(time, error)
          return
        }
        tryEvent(sink, time, value)
      })

      return toDisposable(maybeDisposable)
    } catch (error) {
      return scheduler.asap(propagateErrorEndTask(sink, error))
    }
  }
}

/**
 * Create a stream from a callback-based API
 *
 * The callback function is invoked once and can emit multiple values over time.
 * Returns disposable/cleanup function if provided by the callback setup.
 * A setup that throws is a stream failure: error then end.
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
