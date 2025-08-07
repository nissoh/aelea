import type { IScheduler } from '../types.js'
import { createBrowserScheduler } from './BrowserScheduler.js'
import { createNodeScheduler } from './NodeScheduler.js'

/**
 * Creates an environment-appropriate scheduler
 *
 * - In Node.js: Uses setImmediate for better I/O performance
 * - In Browser: Uses queueMicrotask for smooth UI updates
 * - Fallback: Uses browser scheduler as safe default
 *
 * You can also explicitly import createBrowserScheduler or createNodeScheduler
 * if you need a specific implementation.
 */
export function createDefaultScheduler(): IScheduler {
  // Check if we're in Node.js environment
  if (
    typeof globalThis !== 'undefined' &&
    typeof globalThis.process !== 'undefined' &&
    typeof globalThis.process.versions !== 'undefined' &&
    typeof globalThis.process.versions.node !== 'undefined' &&
    typeof setImmediate === 'function'
  ) {
    return createNodeScheduler()
  }

  // Default to browser scheduler
  return createBrowserScheduler()
}
