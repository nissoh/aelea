/**
 * A headless scheduler with a deterministic idle signal.
 *
 * Like `createHeadlessScheduler`, `asap` and `paint` resolve on the
 * microtask queue (no `requestAnimationFrame`). Unlike it, this scheduler
 * tracks outstanding work — queued microtasks and in-flight `delay` timers
 * — and exposes `idle()`, a promise that resolves the moment the scheduler
 * has nothing left to run. `renderToImage` uses this to settle as fast as a
 * tree's synchronous + timer-driven behaviors quiesce, instead of waiting a
 * fixed wall-clock window.
 *
 * Note `idle()` cannot observe bare `Promise`s (e.g. `fromPromise` /
 * `switchMap(async …)`) — those resolve on the JS microtask queue without
 * touching the scheduler. Their downstream emits *do* re-enter via `asap`,
 * so already-pending resolutions are absorbed, but a value that arrives over
 * the network (a real macrotask later) is invisible here. Resolve such data
 * at the boundary before rendering, or pass `settleMs` to add a quiet guard.
 */

import type { ITask, ITime } from '../stream/index.js'
import type { I$Scheduler } from '../ui/index.js'

const queue: (fn: () => void) => void =
  typeof queueMicrotask === 'function' ? queueMicrotask : fn => Promise.resolve().then(fn)

const perfNow =
  typeof globalThis.performance === 'object' && typeof globalThis.performance?.now === 'function'
    ? () => globalThis.performance.now()
    : () => Date.now()

export interface ISettleScheduler extends I$Scheduler {
  /** Resolves once no microtask batch is queued and no `delay` timer is pending. */
  idle(): Promise<void>
}

class SettleScheduler implements ISettleScheduler {
  private asapTasks: ITask[] = []
  private asapScheduled = false
  private pendingDelays = 0
  private idleWaiters: (() => void)[] = []
  private readonly initialTime = perfNow()
  private readonly initialWallClockTime = Date.now()

  private flushAsapTasks = (): void => {
    this.asapScheduled = false
    const tasks = this.asapTasks
    this.asapTasks = []
    const time = this.time()
    for (let i = 0; i < tasks.length; i++) tasks[i].run(time)
    this.notifyIdle()
  }

  private notifyIdle(): void {
    if (this.asapScheduled || this.asapTasks.length > 0 || this.pendingDelays > 0) return
    if (this.idleWaiters.length === 0) return
    const waiters = this.idleWaiters
    this.idleWaiters = []
    for (let i = 0; i < waiters.length; i++) waiters[i]()
  }

  asap(task: ITask): Disposable {
    this.asapTasks.push(task)
    if (!this.asapScheduled) {
      this.asapScheduled = true
      queue(this.flushAsapTasks)
    }
    return task
  }

  // No paint phase in a headless target — fall through to asap so timing
  // contracts that expect eventual execution still hold.
  paint(task: ITask): Disposable {
    return this.asap(task)
  }

  delay(task: ITask, delay: ITime): Disposable {
    this.pendingDelays++
    let settled = false
    const id = setTimeout(() => {
      if (settled) return
      settled = true
      this.pendingDelays--
      task.run(this.time())
      this.notifyIdle()
    }, delay)
    return {
      [Symbol.dispose]: () => {
        if (settled) return
        settled = true
        clearTimeout(id)
        this.pendingDelays--
        this.notifyIdle()
      }
    }
  }

  idle(): Promise<void> {
    if (!this.asapScheduled && this.asapTasks.length === 0 && this.pendingDelays === 0) {
      return Promise.resolve()
    }
    return new Promise<void>(resolve => this.idleWaiters.push(resolve))
  }

  time(): ITime {
    return perfNow() - this.initialTime
  }

  dayTime(): ITime {
    return this.initialWallClockTime + this.time()
  }
}

export function createSettleScheduler(): ISettleScheduler {
  return new SettleScheduler()
}
