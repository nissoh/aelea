import type { Scheduler } from './types.js'

/**
 * Default environment that provides async scheduling
 */
export const scheduler: Scheduler = {
  schedule: setTimeout,
  currentTime: () => performance.now()
  // interval: setInterval,
  // immediate: setImmediate
}
