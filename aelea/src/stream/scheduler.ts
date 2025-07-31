import type { Scheduler } from './types.js'

/**
 * Default environment that provides async scheduling
 */
export const scheduler: Scheduler = {
  schedule(callback: (...args: any[]) => void, delay: number, ...args: any[]): Disposable {
    const timeoutId = setTimeout(callback, delay, ...args)
    return {
      [Symbol.dispose]() {
        clearTimeout(timeoutId)
      }
    }
  },
  currentTime: () => performance.now()
}
