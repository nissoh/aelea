import type { Scheduler } from 'aelea/stream'

/**
 * Browser scheduler implementation using requestAnimationFrame for immediate scheduling
 * and setTimeout for delayed scheduling
 */
export const browserScheduler: Scheduler = {
  schedule<TArgs extends any[]>(callback: (...args: TArgs) => void, delay: number, ...args: TArgs): Disposable {
    const timeoutId = setTimeout(callback, delay, ...args)
    return {
      [Symbol.dispose]() {
        clearTimeout(timeoutId)
      }
    }
  },

  immediate<TArgs extends any[]>(callback: (...args: TArgs) => void, ...args: TArgs): Disposable {
    let cancelled = false
    const frameId = requestAnimationFrame(() => {
      if (!cancelled) {
        callback(...args)
      }
    })
    return {
      [Symbol.dispose]() {
        cancelled = true
        cancelAnimationFrame(frameId)
      }
    }
  },

  currentTime(): number {
    return performance.now()
  }
}
