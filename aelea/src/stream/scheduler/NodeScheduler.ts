import type { IIdleScheduler, IScheduler } from '../types.js'
import { SchedulerCore } from './core.js'

declare const setImmediate: (fn: (...args: unknown[]) => void, ...args: unknown[]) => ImmediateHandle
declare const clearImmediate: (handle: ImmediateHandle) => void
type ImmediateHandle = { readonly __immediate: true }

/**
 * Flushes asap batches with setImmediate. setImmediate fires in Node's
 * "check" phase, after the "timers" phase, so a delayed task cancels and
 * drains the pending flush first to keep asap-before-delay ordering.
 */
export class NodeScheduler extends SchedulerCore {
  private immediate: ImmediateHandle | null = null

  protected scheduleFlush(): void {
    this.immediate = setImmediate(this.flushImmediate)
  }

  protected override cancelFlush(): void {
    if (this.immediate !== null) {
      clearImmediate(this.immediate)
      this.immediate = null
    }
  }

  private flushImmediate = (): void => {
    this.immediate = null
    this.flushAsapTasks()
  }
}

export function createNodeScheduler(): IScheduler & IIdleScheduler {
  return new NodeScheduler()
}
