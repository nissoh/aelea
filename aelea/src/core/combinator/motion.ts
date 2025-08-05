import { curry2, disposeNone, type ISink, type IStream } from '../../stream/index.js'
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

/**
 * Animates value changes using spring physics
 */
export const motion: IMotionCurry = curry2(
  (config: Partial<MotionConfig>, position: IStream<number>): IStream<number> => {
    const cfg = { ...MOTION_NO_WOBBLE, ...config }
    return stream((sink, scheduler) => new MotionSink(sink, scheduler, cfg, position))
  }
)

class MotionSink implements ISink<number>, Disposable {
  private position = 0
  private target = 0
  private velocity = 0

  private animating = false
  private rafDisposable = disposeNone
  private sourceDisposable: Disposable
  private initialized = false

  constructor(
    private sink: ISink<number>,
    private scheduler: I$Scheduler,
    private config: MotionConfig,
    position: IStream<number>
  ) {
    this.sourceDisposable = position.run(this, scheduler)
  }

  event(newTarget: number): void {
    this.target = newTarget

    if (!this.initialized) {
      this.initialized = true
      this.position = newTarget
      this.sink.event(newTarget)
    }

    if (!this.animating) {
      this.animating = true
      this.rafDisposable = this.scheduler.paint(this.animate)
    }
  }

  error(err: any): void {
    this.sink.error(err)
  }

  end(): void {
    this.sourceDisposable = disposeNone

    if (this.animating) return

    this.rafDisposable[Symbol.dispose]()
    this.sink.end()
  }

  private animate = (): void => {
    const delta = this.target - this.position
    const absDelta = delta < 0 ? -delta : delta
    const absVelocity = this.velocity < 0 ? -this.velocity : this.velocity

    // Check if settled
    if (absVelocity < this.config.precision && absDelta < this.config.precision) {
      this.position = this.target
      this.velocity = 0
      this.animating = false
      this.rafDisposable = disposeNone
      this.sink.event(this.target)

      if (this.sourceDisposable === disposeNone) {
        this.sink.end()
      }

      return
    }

    // Spring physics calculation
    const acceleration = this.config.stiffness * delta - this.config.damping * this.velocity

    // Update state (dt = 1/60 for 60fps)
    this.velocity += acceleration * 0.01666666666666666 // 1/60
    this.position += this.velocity * 0.01666666666666666

    this.sink.event(this.position)
    this.rafDisposable = this.scheduler.paint(this.animate)
  };

  [Symbol.dispose](): void {
    this.rafDisposable[Symbol.dispose]()
    this.sourceDisposable[Symbol.dispose]()

    this.sourceDisposable = disposeNone
  }
}

export interface IMotionCurry {
  (config: Partial<MotionConfig>, position: IStream<number>): IStream<number>
  (config: Partial<MotionConfig>): (position: IStream<number>) => IStream<number>
}
