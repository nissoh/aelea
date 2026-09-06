import type { IIdleScheduler, ISchedulerStats, ITask } from '../stream/index.js'
import { BrowserScheduler } from '../stream/scheduler/BrowserScheduler.js'
import { SchedulerCore } from '../stream/scheduler/core.js'
import type { I$Scheduler } from './types.js'

type RafCallback = (time: number) => void

const raf: (cb: RafCallback) => number =
  typeof globalThis.requestAnimationFrame === 'function'
    ? globalThis.requestAnimationFrame.bind(globalThis)
    : (cb: RafCallback) => setTimeout(() => cb(Date.now()), 16) as unknown as number

const PAINT_DRAIN_GUARD = 100

export type IUiScheduler = I$Scheduler & IIdleScheduler

/**
 * The browser renderer's scheduler. `asap` is the compute phase (microtask:
 * stream propagation, DOM reads, tree creation); `paint` is the write phase
 * (requestAnimationFrame: one frame, N writes). Paints scheduled during a
 * flush drain in the same frame, bounded so a runaway self-rescheduling task
 * yields to the next frame instead of freezing it.
 */
class DomScheduler extends BrowserScheduler implements IUiScheduler {
  private paintTasks: ITask[] = []
  private paintScheduled = false
  private drainPasses = 0
  private guardTrips = 0

  private flushPaintTasks = (): void => {
    let passes = 0
    while (this.paintTasks.length > 0 && passes < PAINT_DRAIN_GUARD) {
      passes++
      const tasks = this.paintTasks
      this.paintTasks = []
      const time = this.time()
      for (let i = 0; i < tasks.length; i++) this.runGuarded(tasks[i], time)
    }
    this.drainPasses += passes
    if (this.paintTasks.length > 0) {
      this.guardTrips++
      raf(this.flushPaintTasks)
    } else {
      this.paintScheduled = false
      this.settle()
    }
  }

  paint(task: ITask): Disposable {
    this.paintTasks.push(task)
    if (!this.paintScheduled) {
      this.paintScheduled = true
      this.outstanding++
      raf(this.flushPaintTasks)
    }
    return task
  }

  override stats(): ISchedulerStats {
    return {
      ...super.stats(),
      paintDepth: this.paintTasks.length,
      drainPasses: this.drainPasses,
      guardTrips: this.guardTrips
    }
  }
}

/**
 * For environments without a compositor (Node, Bun, image pipelines): paint
 * falls through to asap, so timing contracts that expect eventual execution
 * still hold and `idle()` settles the instant the tree quiesces.
 */
class HeadlessScheduler extends BrowserScheduler implements IUiScheduler {
  paint(task: ITask): Disposable {
    return this.asap(task)
  }
}

/**
 * Runs asap and paint tasks inline, so a mount is fully materialized when
 * `render` returns. For tests and benchmarks.
 */
class SyncScheduler extends SchedulerCore implements IUiScheduler {
  protected scheduleFlush(): void {}

  override asap(task: ITask): Disposable {
    this.runGuarded(task, this.time())
    return task
  }

  paint(task: ITask): Disposable {
    return this.asap(task)
  }
}

export function createDomScheduler(): IUiScheduler {
  return new DomScheduler()
}

export function createHeadlessScheduler(): IUiScheduler {
  return new HeadlessScheduler()
}

export function createSyncScheduler(): IUiScheduler {
  return new SyncScheduler()
}
