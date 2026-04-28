import type { ITask, ITime } from '../stream/index.js'
import type { I$Scheduler } from './types.js'

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

class DomScheduler implements I$Scheduler {
  private asapTasks: ITask[] = []
  private paintTasks: ITask[] = []
  private asapScheduled = false
  private paintScheduled = false
  private readonly initialTime = perfNow()
  private readonly initialWallClockTime = Date.now()

  // Drain any pending asap tasks before a delayed task fires. No
  // cancellation flag needed — flushAsapTasks is idempotent: if the
  // scheduled microtask fires after we've already drained here, it
  // simply finds an empty queue and returns. The `asapScheduled` flag
  // gates re-entry.
  runDelayedTask = (task: ITask): void => {
    if (this.asapScheduled) this.flushAsapTasks()
    task.run(this.time())
  }

  flushAsapTasks = (): void => {
    if (!this.asapScheduled) return
    this.asapScheduled = false
    const tasks = this.asapTasks
    this.asapTasks = []
    for (let i = 0; i < tasks.length; i++) tasks[i].run(this.time())
  }

  flushPaintTasks = (): void => {
    this.paintScheduled = false
    const tasks = this.paintTasks
    this.paintTasks = []

    for (let i = 0; i < tasks.length; i++) tasks[i].run(this.time())
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
    setTimeout(this.runDelayedTask, delay, task)
    return task
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

  private flushAsapTasks = (): void => {
    if (!this.asapScheduled) return
    this.asapScheduled = false
    const tasks = this.asapTasks
    this.asapTasks = []
    for (let i = 0; i < tasks.length; i++) tasks[i].run(this.time())
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
    setTimeout(() => task.run(this.time()), delay)
    return task
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
