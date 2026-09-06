import type { IIdleScheduler, IScheduler, ISchedulerStats, ITask, ITime } from '../types.js'
import { runTaskGuarded } from './runTaskGuarded.js'

const perfNow =
  typeof globalThis.performance === 'object' && typeof globalThis.performance?.now === 'function'
    ? () => globalThis.performance.now()
    : () => Date.now()

/**
 * The one asap queue every scheduler is built on: guarded task runs, a
 * recycled batch array, asap-before-delay ordering, and an idle signal that
 * resolves once no batch, timer or paint is outstanding. Subclasses choose
 * how a flush is queued (microtask, setImmediate, inline) and may add a paint
 * phase.
 */
export abstract class SchedulerCore implements IScheduler, IIdleScheduler {
  protected asapTasks: ITask[] = []
  protected asapScheduled = false
  protected outstanding = 0
  protected taskErrors = 0
  private recycled: ITask[] | null = null
  private idleWaiters: (() => void)[] | null = null
  private readonly initialTime = perfNow()
  private readonly initialWallClockTime = Date.now()

  protected abstract scheduleFlush(): void

  protected cancelFlush(): void {}

  protected runGuarded(task: ITask, time: ITime): void {
    if (!runTaskGuarded(task, time)) this.taskErrors++
  }

  protected flushAsapTasks = (): void => {
    if (!this.asapScheduled) return
    this.asapScheduled = false
    const tasks = this.asapTasks
    const time = this.time()
    if (tasks.length === 1) {
      const task = tasks[0]
      tasks.length = 0
      this.runGuarded(task, time)
    } else {
      this.asapTasks = this.recycled ?? []
      this.recycled = null
      for (let i = 0; i < tasks.length; i++) this.runGuarded(tasks[i], time)
      tasks.length = 0
      this.recycled = tasks
    }
    this.settle()
  }

  protected runDelayedTask = (task: ITask): void => {
    if (this.asapScheduled) {
      this.cancelFlush()
      this.flushAsapTasks()
    }
    this.runGuarded(task, this.time())
  }

  protected settle(): void {
    if (--this.outstanding > 0 || this.idleWaiters === null) return
    const waiters = this.idleWaiters
    this.idleWaiters = null
    for (let i = 0; i < waiters.length; i++) waiters[i]()
  }

  asap(task: ITask): Disposable {
    this.asapTasks.push(task)
    if (!this.asapScheduled) {
      this.asapScheduled = true
      this.outstanding++
      this.scheduleFlush()
    }
    return task
  }

  delay(task: ITask, delay: ITime): Disposable {
    this.outstanding++
    return new DelayedTask(this, task, delay)
  }

  idle(): Promise<void> {
    if (this.outstanding === 0) return Promise.resolve()
    return new Promise<void>(resolve => (this.idleWaiters ??= []).push(resolve))
  }

  stats(): ISchedulerStats {
    return {
      asapDepth: this.asapTasks.length,
      paintDepth: 0,
      drainPasses: 0,
      guardTrips: 0,
      taskErrors: this.taskErrors
    }
  }

  time(): ITime {
    return perfNow() - this.initialTime
  }

  dayTime(): ITime {
    return this.initialWallClockTime + this.time()
  }

  fire(handle: DelayedTask): void {
    this.settle()
    this.runDelayedTask(handle.task)
  }

  cancel(handle: DelayedTask): void {
    clearTimeout(handle.handle)
    handle.task[Symbol.dispose]()
    this.settle()
  }
}

class DelayedTask implements Disposable {
  readonly handle: ReturnType<typeof setTimeout>
  settled = false

  constructor(
    readonly scheduler: SchedulerCore,
    readonly task: ITask,
    delay: ITime
  ) {
    this.handle = setTimeout(fireDelayed, delay, this)
  }

  [Symbol.dispose](): void {
    if (this.settled) return
    this.settled = true
    this.scheduler.cancel(this)
  }
}

function fireDelayed(handle: DelayedTask): void {
  if (handle.settled) return
  handle.settled = true
  handle.scheduler.fire(handle)
}
