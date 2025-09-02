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

class DomScheduler implements I$Scheduler {
  private asapTasks: ITask[] = []
  private paintTasks: ITask[] = []
  private asapScheduled = false
  private paintScheduled = false
  private readonly startTime = performance.now()

  runDelayedTask = (task: ITask): void => {
    task.run(this.time())
  }

  flushAsapTasks = (): void => {
    const tasks = this.asapTasks
    const time = this.time()

    this.asapScheduled = false
    this.asapTasks = []

    for (let i = 0; i < tasks.length; i++) tasks[i].run(time)
  }

  flushPaintTasks = (): void => {
    const tasks = this.paintTasks
    const time = this.time()

    this.paintScheduled = false
    this.paintTasks = []

    for (let i = 0; i < tasks.length; i++) tasks[i].run(time)
  }

  delay(task: ITask, delay: ITime): Disposable {
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

  time(): ITime {
    return performance.now() - this.startTime
  }
}

export function createDomScheduler(): I$Scheduler {
  return new DomScheduler()
}
