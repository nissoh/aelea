import { curry2 } from '../function.js'
import type { IStream } from '../types.js'

export interface IPeriodicCurry {
  <T>(period: number, value: T): IStream<T>
  <T>(period: number): (value: T) => IStream<T>
}

export const periodic: IPeriodicCurry = curry2((period, value) => ({
  run(scheduler, sink) {
    let currentDisposable: Disposable | null = null
    let disposed = false

    const scheduleNext = () => {
      if (disposed) return
      sink.event(value)

      currentDisposable = scheduler.schedule(() => {
        scheduleNext() // Schedule the next emission
      }, period)
    }

    // Start the periodic emissions
    scheduleNext()

    return {
      [Symbol.dispose]() {
        disposed = true
        currentDisposable?.[Symbol.dispose]()
      }
    }
  }
}))
