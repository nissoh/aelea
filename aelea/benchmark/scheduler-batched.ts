import { disposeWith } from '../src/stream/disposable.js'
import type { Scheduler, Sink } from '../src/stream/types.js'

// Batched scheduler that processes tasks in microtasks
export const batchedScheduler: Scheduler = {
  asap<TArgs extends any[], T>(sink: Sink<T>, callback: (sink: Sink<T>, ...args: TArgs) => void, ...args: TArgs) {
    let disposed = false

    // Use queueMicrotask for batching
    queueMicrotask(() => {
      if (!disposed) {
        callback(sink, ...args)
      }
    })

    return disposeWith(() => {
      disposed = true
    })
  },

  delay<TArgs extends any[], T>(
    sink: Sink<T>,
    callback: (sink: Sink<T>, ...args: TArgs) => void,
    delay: number,
    ...args: TArgs
  ) {
    const id = setTimeout(() => callback(sink, ...args), delay)
    return disposeWith(clearTimeout, id)
  },

  time: () => Date.now()
}

// Synchronous scheduler for comparison
export const syncScheduler: Scheduler = {
  asap<TArgs extends any[], T>(sink: Sink<T>, callback: (sink: Sink<T>, ...args: TArgs) => void, ...args: TArgs) {
    callback(sink, ...args)
    return disposeWith(() => {})
  },

  delay<TArgs extends any[], T>(
    sink: Sink<T>,
    callback: (sink: Sink<T>, ...args: TArgs) => void,
    delay: number,
    ...args: TArgs
  ) {
    const id = setTimeout(() => callback(sink, ...args), delay)
    return disposeWith(clearTimeout, id)
  },

  time: () => Date.now()
}
