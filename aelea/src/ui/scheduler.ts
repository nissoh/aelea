import type { ITask, ITime } from '../stream/index.js'
import { DelayDisposable } from '../stream/scheduler/DelayDisposable.js'
import type { I$Scheduler, ISchedulerStats } from './types.js'

// One throwing task must not abort the rest of its batch nor wedge the
// scheduled flag (a wedged paint flag freezes every DOM write app-wide).
// Failures route to the task's own error channel; a double fault is
// rethrown asynchronously so it still surfaces without killing the flush.
function runTaskGuarded(task: ITask, time: ITime, counters: { taskErrors: number }): void {
  try {
    task.run(time)
  } catch (err) {
    counters.taskErrors++
    try {
      task.error(time, err)
    } catch (err2) {
      counters.taskErrors++
      queue(() => {
        throw err2
      })
    }
  }
}

/**
 * Optimized browser scheduler for DOM operations
 *
 * Phase separation:
 * - asap() for compute phase (microtask)
 *   - Compute: Pure calculations, stream transformations
 *   - Measure: DOM reads (getBoundingClientRect, offsetWidth, etc.)
 *   - DOM Tree creation: Node.insertBefore, ParentNode.prepend
 *
 * - paint() for render phase (requestAnimationFrame)
 *   - Mutate: DOM writes (style changes, attributes)
 *   - Effect: Post-paint operations (focus, scroll, animations)
 *
 * IMPORTANT: Tasks are NOT synchronized between phases. Paint tasks may execute
 * before pending compute tasks if scheduled in different event loop cycles.
 * Design your code to handle this async behavior or ensure dependent tasks
 * are scheduled in the correct phase.
 */

const queue = typeof queueMicrotask === 'function' ? queueMicrotask : (fn: () => void) => Promise.resolve().then(fn)

type RafCallback = (time: number) => void

const raf: (cb: RafCallback) => number =
  typeof globalThis.requestAnimationFrame === 'function'
    ? globalThis.requestAnimationFrame.bind(globalThis)
    : (cb: RafCallback) => setTimeout(() => cb(Date.now()), 16) as unknown as number

const perfNow =
  typeof globalThis.performance === 'object' && typeof globalThis.performance?.now === 'function'
    ? () => globalThis.performance.now()
    : () => Date.now()

const PAINT_DRAIN_GUARD = 100

class DomScheduler implements I$Scheduler {
  private asapTasks: ITask[] = []
  private paintTasks: ITask[] = []
  private asapScheduled = false
  private paintScheduled = false
  private readonly initialTime = perfNow()
  private readonly initialWallClockTime = Date.now()
  private readonly counters = { taskErrors: 0 }
  private drainPasses = 0
  private guardTrips = 0

  // Drain any pending asap tasks before a delayed task fires. No
  // cancellation flag needed — flushAsapTasks is idempotent: if the
  // scheduled microtask fires after we've already drained here, it
  // simply finds an empty queue and returns. The `asapScheduled` flag
  // gates re-entry.
  runDelayedTask = (task: ITask): void => {
    if (this.asapScheduled) this.flushAsapTasks()
    runTaskGuarded(task, this.time(), this.counters)
  }

  flushAsapTasks = (): void => {
    if (!this.asapScheduled) return
    this.asapScheduled = false
    const tasks = this.asapTasks
    this.asapTasks = []
    const time = this.time()
    for (let i = 0; i < tasks.length; i++) runTaskGuarded(tasks[i], time, this.counters)
  }

  flushPaintTasks = (): void => {
    let passes = 0
    while (this.paintTasks.length > 0 && passes < PAINT_DRAIN_GUARD) {
      passes++
      const tasks = this.paintTasks
      this.paintTasks = []
      const time = this.time()
      for (let i = 0; i < tasks.length; i++) runTaskGuarded(tasks[i], time, this.counters)
    }
    this.drainPasses += passes
    if (this.paintTasks.length > 0) {
      this.guardTrips++
      raf(this.flushPaintTasks)
    } else {
      this.paintScheduled = false
    }
  }

  stats(): ISchedulerStats {
    return {
      asapDepth: this.asapTasks.length,
      paintDepth: this.paintTasks.length,
      drainPasses: this.drainPasses,
      guardTrips: this.guardTrips,
      taskErrors: this.counters.taskErrors
    }
  }

  asap(task: ITask): Disposable {
    this.asapTasks.push(task)

    if (!this.asapScheduled) {
      this.asapScheduled = true
      queue(this.flushAsapTasks)
    }

    return task
  }

  delay(task: ITask, delay: ITime): Disposable {
    return new DelayDisposable(setTimeout(this.runDelayedTask, delay, task), task)
  }

  paint(task: ITask): Disposable {
    this.paintTasks.push(task)

    if (!this.paintScheduled) {
      this.paintScheduled = true
      raf(this.flushPaintTasks)
    }

    return task
  }

  time(): ITime {
    return performance.now() - this.initialTime
  }

  dayTime(): ITime {
    return this.initialWallClockTime + this.time()
  }
}

export function createDomScheduler(): I$Scheduler {
  return new DomScheduler()
}

/**
 * Headless scheduler for environments without a real compositor (Node,
 * Bun, image-generation pipelines). `paint` resolves on the same
 * microtask queue as `asap` — no `requestAnimationFrame` dependency,
 * no global polyfills.
 */
class HeadlessScheduler implements I$Scheduler {
  private asapTasks: ITask[] = []
  private asapScheduled = false
  private readonly initialTime = perfNow()
  private readonly initialWallClockTime = Date.now()
  private readonly counters = { taskErrors: 0 }

  private flushAsapTasks = (): void => {
    if (!this.asapScheduled) return
    this.asapScheduled = false
    const tasks = this.asapTasks
    this.asapTasks = []
    const time = this.time()
    for (let i = 0; i < tasks.length; i++) runTaskGuarded(tasks[i], time, this.counters)
  }

  stats(): ISchedulerStats {
    return {
      asapDepth: this.asapTasks.length,
      paintDepth: 0,
      drainPasses: 0,
      guardTrips: 0,
      taskErrors: this.counters.taskErrors
    }
  }

  asap(task: ITask): Disposable {
    this.asapTasks.push(task)
    if (!this.asapScheduled) {
      this.asapScheduled = true
      queue(this.flushAsapTasks)
    }
    return task
  }

  runDelayedTask = (task: ITask): void => {
    runTaskGuarded(task, this.time(), this.counters)
  }

  delay(task: ITask, delay: ITime): Disposable {
    return new DelayDisposable(setTimeout(this.runDelayedTask, delay, task), task)
  }

  // No paint phase — headless environments don't benefit from deferring
  // writes to the next frame. Fall through to asap so timing contracts
  // that expect eventual execution still hold.
  paint(task: ITask): Disposable {
    return this.asap(task)
  }

  time(): ITime {
    return perfNow() - this.initialTime
  }

  dayTime(): ITime {
    return this.initialWallClockTime + this.time()
  }
}

export function createHeadlessScheduler(): I$Scheduler {
  return new HeadlessScheduler()
}
