import type { IIdleScheduler, IScheduler } from '../types.js'
import { SchedulerCore } from './core.js'

const queue: (fn: () => void) => void =
  typeof queueMicrotask === 'function' ? queueMicrotask : fn => Promise.resolve().then(fn)

/**
 * Flushes asap batches on the microtask queue. Each scheduler instance
 * tracks time from 0 at instantiation.
 */
export class BrowserScheduler extends SchedulerCore {
  protected scheduleFlush(): void {
    queue(this.flushAsapTasks)
  }
}

export function createBrowserScheduler(): IScheduler & IIdleScheduler {
  return new BrowserScheduler()
}
