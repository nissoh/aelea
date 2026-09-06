import type { IIdleScheduler, IScheduler } from '../types.js'
import { createBrowserScheduler } from './BrowserScheduler.js'
import { createNodeScheduler } from './NodeScheduler.js'

/**
 * Node: setImmediate-backed asap. Anywhere else: microtask-backed asap.
 */
export function createDefaultScheduler(): IScheduler & IIdleScheduler {
  const g = globalThis as unknown as Record<string, unknown>
  const process = g.process as { versions?: { node?: string } } | undefined

  if (process?.versions?.node !== undefined && typeof g.setImmediate === 'function') {
    return createNodeScheduler()
  }

  return createBrowserScheduler()
}
