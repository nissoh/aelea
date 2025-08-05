import { disposeWith, type ITask } from '../stream/index.js'
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
  // Ring buffer for render tasks
  private static readonly RENDER_BUFFER_SIZE = 1024
  private static readonly RENDER_MASK = 1023
  private renderTasks: Array<(() => void) | null> = new Array(DomScheduler.RENDER_BUFFER_SIZE)
  private renderHead = 0
  private renderTail = 0
  private rafId: number | null = null

  // Standard IScheduler methods
  delay<TArgs extends readonly unknown[]>(task: ITask<TArgs>, delay: number, ...args: TArgs): Disposable {
    let cancelled = false

    const timeoutId = setTimeout(() => {
      if (!cancelled) {
        task(...args)
      }
    }, delay)

    return disposeWith(() => {
      cancelled = true
      clearTimeout(timeoutId)
    })
  }

  asap<TArgs extends readonly unknown[]>(task: ITask<TArgs>, ...args: TArgs): Disposable {
    let cancelled = false

    Promise.resolve(null).then(() => {
      if (!cancelled) {
        task(...args)
      }
    })

    // queueMicrotask(() => {
    //   if (!cancelled) {
    //     task(...args)
    //   }
    // })

    return disposeWith(() => {
      cancelled = true
    })
  }

  paint<TArgs extends readonly unknown[]>(task: ITask<TArgs>, ...args: TArgs): Disposable {
    let cancelled = false

    // Fast ring buffer enqueue
    const nextTail = (this.renderTail + 1) & DomScheduler.RENDER_MASK
    if (nextTail === this.renderHead) {
      throw new Error('DomScheduler render buffer overflow - too many pending paint tasks')
    }

    this.renderTasks[this.renderTail] = () => {
      if (!cancelled) {
        task(...args)
      }
    }
    this.renderTail = nextTail

    if (this.rafId === null) {
      this.rafId = requestAnimationFrame(() => {
        this.rafId = null
        this.flushRender()
      })
    }

    return disposeWith(() => {
      cancelled = true
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
      try {
        task!() // Non-null assertion - we know task exists here
      } catch (error) {
        // Log but don't stop processing other tasks
        console.error('Error in render task:', error)
      }
      head = (head + 1) & mask
    }

    this.renderHead = head
  }

  time(): number {
    return performance.now()
  }
}

export function createDomScheduler(): I$Scheduler {
  return new DomScheduler()
}
