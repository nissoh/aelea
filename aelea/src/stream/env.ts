import type { Scheduler } from './types.js'

/**
 * Default environment that provides async scheduling
 */
export const defaultEnv: Scheduler = {
  setTimeout: setTimeout,
  setInterval: setInterval,
  setImmediate: setImmediate
}
