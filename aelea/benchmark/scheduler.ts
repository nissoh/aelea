import type { Scheduler } from '../src/stream/types.js'

// Simple synchronous scheduler for benchmarking
export const benchmarkScheduler: Scheduler = {
  asap<TArgs extends any[], T>(
    sink: any,
    callback: (sink: any, ...args: TArgs) => void,
    ...args: TArgs
  ) {
    callback(sink, ...args)
    return { [Symbol.dispose]: () => {} }
  },
  
  delay<TArgs extends any[], T>(
    sink: any,
    callback: (sink: any, ...args: TArgs) => void,
    delay: number,
    ...args: TArgs
  ) {
    const id = setTimeout(() => callback(sink, ...args), delay)
    return {
      [Symbol.dispose]: () => clearTimeout(id)
    }
  },
  
  time: () => Date.now()
}