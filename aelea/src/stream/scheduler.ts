import type { Scheduler } from './types.js'

/**
 * Default environment that provides async scheduling
 */
export const scheduler: Scheduler = {
  schedule(callback: () => void, delay: number) {
    const timeoutId = setTimeout(callback, delay)
    return {
      [Symbol.dispose]() {
        clearTimeout(timeoutId)
      }
    }
  },
  currentTime: () => performance.now()
}
