import type { Scheduler, Sink } from 'aelea/stream'

/**
 * Browser scheduler implementation using requestAnimationFrame for immediate scheduling
 * and setTimeout for delayed scheduling
 */
export const browserScheduler: Scheduler = {
  delay<T, TArgs extends any[]>(
    sink: Sink<T>,
    callback: (sink: Sink<T>, ...args: TArgs) => void,
    delay: number,
    ...args: TArgs
  ): Disposable {
    const timeoutId = setTimeout(callback, delay, sink, ...args)
    return {
      [Symbol.dispose]() {
        clearTimeout(timeoutId)
      }
    }
  },

  // asap<TArgs extends readonly unknown[], T>(sink: any, callback: (sink: any, ...args: TArgs) => void, ...args: TArgs) {
  //   let disposed = false

  //   queueMicrotask(() => {
  //     if (!disposed) {
  //       callback(sink, ...args)
  //     }
  //   })

  //   return disposeWith(() => {
  //     disposed = true
  //   })
  // },
  asap<T, TArgs extends any[]>(
    sink: Sink<T>,
    callback: (sink: Sink<T>, ...args: TArgs) => void,
    ...args: TArgs
  ): Disposable {
    let cancelled = false
    const frameId = requestAnimationFrame(() => {
      if (!cancelled) {
        callback(sink, ...args)
      }
    })
    return {
      [Symbol.dispose]() {
        cancelled = true
        cancelAnimationFrame(frameId)
      }
    }
  },

  time(): number {
    return performance.now()
  }
}
