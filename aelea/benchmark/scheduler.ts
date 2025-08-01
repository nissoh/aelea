import { disposeWith } from '../src/stream/disposable.js'
import type { Scheduler } from '../src/stream/types.js'

// Performant scheduler using queueMicrotask for benchmarking
export const scheduller: Scheduler = {
  asap<TArgs extends readonly unknown[], T>(sink: any, callback: (sink: any, ...args: TArgs) => void, ...args: TArgs) {
    let disposed = false

    queueMicrotask(() => {
      if (!disposed) {
        callback(sink, ...args)
      }
    })

    return disposeWith(() => {
      disposed = true
    })
  },

  delay<TArgs extends readonly unknown[], T>(
    sink: any,
    callback: (sink: any, ...args: TArgs) => void,
    delay: number,
    ...args: TArgs
  ) {
    const id = setTimeout(() => callback(sink, ...args), delay)
    return disposeWith(clearTimeout, id)
  },

  time: () => Date.now()
}
