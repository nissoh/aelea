import { curry2, type ISink, type IStream } from '../../stream/index.js'
import { stream } from '../stream.js'
import type { I$Scheduler } from '../types.js'

interface MotionConfig {
  stiffness: number
  damping: number
  precision: number
}

export const MOTION_NO_WOBBLE = { stiffness: 170, damping: 26, precision: 0.01 }
export const MOTION_GENTLE = { stiffness: 120, damping: 14, precision: 0.01 }
export const MOTION_WOBBLY = { stiffness: 180, damping: 12, precision: 0.01 }
export const MOTION_STIFF = { stiffness: 210, damping: 20, precision: 0.01 }

export interface IMotionCurry {
  (config: Partial<MotionConfig>, position: IStream<number>): IStream<number>
  (config: Partial<MotionConfig>): (position: IStream<number>) => IStream<number>
}

/**
 * Motion combinator that animates position changes from an input stream
 *
 * @param config - Spring animation configuration
 * @param position - Stream of target positions to animate to
 * @returns Stream of animated positions
 *
 * @example
 * const clicks = fromEvent(button, 'click')
 * const position = scan((x) => x + 100, 0, clicks)
 * const animated = motion(MOTION_GENTLE, position)
 *
 * // Or curried:
 * const gentleMotion = motion(MOTION_GENTLE)
 * const animated = gentleMotion(position)
 */
export const motion: IMotionCurry = curry2(
  (config: Partial<MotionConfig>, position: IStream<number>): IStream<number> => {
    const cfg = { ...MOTION_NO_WOBBLE, ...config }
    return stream((scheduler, sink) => new MotionSink(scheduler, sink, cfg, position))
  }
)

class MotionSink implements ISink<number>, Disposable {
  private position = 0
  private target = 0
  private velocity = 0
  private animating = false
  private disposed = false
  private initialized = false
  private rafDisposable: Disposable | null = null
  private sourceDisposable: Disposable
  private sourceEnded = false

  constructor(
    private scheduler: I$Scheduler,
    private sink: ISink<number>,
    private config: MotionConfig,
    position: IStream<number>
  ) {
    this.sourceDisposable = position.run(scheduler, this)
  }

  event(newTarget: number): void {
    if (this.disposed) return

    if (!this.initialized) {
      // First event - set both position and target to this value
      this.initialized = true
      this.position = newTarget
      this.target = newTarget
      this.sink.event(newTarget)
    } else {
      // Subsequent events - animate to new target
      this.target = newTarget
      if (!this.animating) {
        this.animating = true
        this.scheduleFrame()
      }
    }
  }

  error(err: any): void {
    if (!this.disposed) {
      this.disposed = true
      this.cleanup()
      this.sink.error(err)
    }
  }

  end(): void {
    this.sourceEnded = true
    if (!this.disposed && !this.animating) {
      this.disposed = true
      this.sink.end()
    }
  }

  private scheduleFrame(): void {
    this.rafDisposable = this.scheduler.paint(this.sink, this.animate)
  }

  private animate = (): void => {
    if (this.disposed) return

    const delta = this.target - this.position
    const settled = Math.abs(this.velocity) < this.config.precision && Math.abs(delta) < this.config.precision

    if (settled) {
      this.position = this.target
      this.velocity = 0
      this.animating = false
      this.rafDisposable = null
      this.sink.event(this.target)

      // Check if we can end the stream now
      if (this.sourceEnded) {
        this.disposed = true
        this.sink.end()
      }
      return
    }

    // Spring physics
    const spring = this.config.stiffness * delta
    const damper = this.config.damping * this.velocity
    const acceleration = spring - damper

    // Update state (dt = 1/60 for 60fps)
    this.velocity += acceleration / 60
    this.position += this.velocity / 60

    this.sink.event(this.position)

    // Schedule next frame
    this.scheduleFrame()
  }

  private cleanup(): void {
    this.rafDisposable?.[Symbol.dispose]()
    this.sourceDisposable?.[Symbol.dispose]()
  }

  [Symbol.dispose](): void {
    if (!this.disposed) {
      this.disposed = true
      this.cleanup()
    }
  }
}
