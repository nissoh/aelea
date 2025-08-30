import type { ITask } from '../stream/index.js'
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

class DomScheduler implements I$Scheduler {
  // Instance arrays for asap and paint phases
  asapTasks: ITask[] = []
  paintTasks: ITask[] = []
  asapScheduled = false
  paintScheduled = false

  runDelayedTask = (task: ITask): void => {
    task.run(this.time())
  }

  // Arrow functions as instance properties - created once per scheduler instance
  flushAsapTasks = (): void => {
    this.asapScheduled = false
    const tasks = this.asapTasks
    this.asapTasks = []

    const time = this.time()

    for (const task of tasks) task.run(time)
  }

  flushPaintTasks = (time: DOMHighResTimeStamp): void => {
    this.paintScheduled = false
    const tasks = this.paintTasks
    this.paintTasks = []

    for (const task of tasks) task.run(time)
  }

  delay(task: ITask, delay: number): Disposable {
    setTimeout(this.runDelayedTask, delay, task)
    return task
  }

  asap(task: ITask): Disposable {
    this.asapTasks.push(task)

    if (!this.asapScheduled) {
      this.asapScheduled = true
      queueMicrotask(this.flushAsapTasks)
    }

    return task
  }

  paint(task: ITask): Disposable {
    this.paintTasks.push(task)

    if (!this.paintScheduled) {
      this.paintScheduled = true
      requestAnimationFrame(this.flushPaintTasks)
    }

    return task
  }

  time(): number {
    return performance.now()
  }
}

export function createDomScheduler(): I$Scheduler {
  return new DomScheduler()
}
