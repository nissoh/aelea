import { type Args, disposeWith, type ISink, type ITask } from '../stream/index.js'
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
  // Ring buffer for compute tasks - power of 2 for fast modulo
  private static readonly COMPUTE_BUFFER_SIZE = 4096
  private static readonly COMPUTE_MASK = 4095
  private computeTasks: Array<(() => void) | null> = new Array(DomScheduler.COMPUTE_BUFFER_SIZE)
  private computeHead = 0
  private computeTail = 0
  private computeScheduled = false

  // Ring buffer for render tasks
  private static readonly RENDER_BUFFER_SIZE = 1024
  private static readonly RENDER_MASK = 1023
  private renderTasks: Array<(() => void) | null> = new Array(DomScheduler.RENDER_BUFFER_SIZE)
  private renderHead = 0
  private renderTail = 0
  private rafId: number | null = null

  // Standard IScheduler methods
  delay<T, TArgs extends Args>(sink: ISink<T>, task: ITask<T, TArgs>, delay: number, ...args: TArgs): Disposable {
    let cancelled = false

    const timeoutId = setTimeout(() => {
      if (!cancelled) {
        task(sink, ...args)
      }
    }, delay)

    return disposeWith(() => {
      cancelled = true
      clearTimeout(timeoutId)
    })
  }

  asap<T, TArgs extends Args>(sink: ISink<T>, task: ITask<T, TArgs>, ...args: TArgs): Disposable {
    let cancelled = false

    // Fast ring buffer enqueue
    const nextTail = (this.computeTail + 1) & DomScheduler.COMPUTE_MASK
    if (nextTail === this.computeHead) {
      throw new Error('DomScheduler compute buffer overflow - too many pending tasks')
    }

    this.computeTasks[this.computeTail] = () => {
      if (!cancelled) {
        task(sink, ...args)
      }
    }
    this.computeTail = nextTail

    this.scheduleCompute()

    return disposeWith(() => {
      cancelled = true
    })
  }

  paint<T, TArgs extends readonly unknown[]>(sink: ISink<T>, task: ITask<T, TArgs>, ...args: TArgs): Disposable {
    let cancelled = false

    // Fast ring buffer enqueue
    const nextTail = (this.renderTail + 1) & DomScheduler.RENDER_MASK
    if (nextTail === this.renderHead) {
      throw new Error('DomScheduler render buffer overflow - too many pending paint tasks')
    }

    this.renderTasks[this.renderTail] = () => {
      if (!cancelled) {
        task(sink, ...args)
      }
    }
    this.renderTail = nextTail

    this.scheduleRender()

    return disposeWith(() => {
      cancelled = true
    })
  }

  time(): number {
    return performance.now()
  }

  private scheduleCompute(): void {
    if (this.computeScheduled) return
    this.computeScheduled = true

    queueMicrotask(() => {
      this.computeScheduled = false
      this.flushCompute()
    })
  }

  private flushCompute(): void {
    // Cache for faster access
    const tasks = this.computeTasks
    const mask = DomScheduler.COMPUTE_MASK
    let head = this.computeHead
    const tail = this.computeTail

    // Tight execution loop
    while (head !== tail) {
      const task = tasks[head]
      tasks[head] = null // Clear reference to allow GC
      task!() // Non-null assertion - we know task exists here
      head = (head + 1) & mask
    }

    this.computeHead = head
  }

  private scheduleRender(): void {
    if (this.rafId !== null) return

    this.rafId = requestAnimationFrame(() => {
      this.rafId = null
      this.flushRender()
    })
  }

  private flushRender(): void {
    // Cache for faster access
    const tasks = this.renderTasks
    const mask = DomScheduler.RENDER_MASK
    let head = this.renderHead
    const tail = this.renderTail

    // Tight execution loop
    while (head !== tail) {
      const task = tasks[head]
      tasks[head] = null // Clear reference to allow GC
      task!() // Non-null assertion - we know task exists here
      head = (head + 1) & mask
    }

    this.renderHead = head
  }
}

export function createDomScheduler(): I$Scheduler {
  return new DomScheduler()
}
