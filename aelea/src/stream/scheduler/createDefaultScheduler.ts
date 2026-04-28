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
  // Check if we're in Node.js environment.
  // setImmediate is the Node-only signal; guard via globalThis indexing so the check
  // compiles without @types/node.
  const g = globalThis as unknown as Record<string, unknown>
  const process = g.process as { versions?: { node?: string } } | undefined

  if (process?.versions?.node !== undefined && typeof g.setImmediate === 'function') {
    return createNodeScheduler()
  }

  // Default to browser scheduler
  return createBrowserScheduler()
}
