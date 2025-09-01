import {
  curry2,
  disposeBoth,
  type IScheduler,
  type ISink,
  type IStream,
  PropagateTask,
  type Time
} from '../../stream/index.js'
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
    return new Motion(cfg, position)
  }
)

/**
 * Stream that animates value changes using spring physics
 */
class Motion implements IStream<number> {
  constructor(
    readonly config: MotionConfig,
    readonly position: IStream<number>
  ) {}

  run(sink: ISink<number>, scheduler: IScheduler): Disposable {
    const disposableSink = new MotionSink(sink, scheduler as I$Scheduler, this.config)
    return disposeBoth(this.position.run(disposableSink, scheduler), disposableSink)
  }
}

class MotionSink extends PropagateTask<number> implements ISink<number> {
  position = 0
  target = 0
  velocity = 0
  animating = false
  initialized = false
  sourceEnded = false
  readonly dt = 0.016666666666666666 // 1/60

  constructor(
    sink: ISink<number>,
    readonly scheduler: I$Scheduler,
    readonly config: MotionConfig
  ) {
    super(sink)
  }

  event(time: Time, target: number): void {
    this.target = target

    if (this.animating) return

    if (!this.initialized) {
      this.initialized = true
      this.position = target
      this.sink.event(time, target)
    }

    this.animating = true
    this.scheduler.paint(this)
  }

  error(time: Time, err: unknown): void {
    this.sink.error(time, err)
  }

  end(time: Time): void {
    this.sourceEnded = true

    if (this.animating) return

    this.sink.end(time)
  }

  runIfActive(time: Time): void {
    const delta = this.target - this.position
    const absDelta = Math.abs(delta)
    const absVelocity = Math.abs(this.velocity)

    // Check if settled
    if (absVelocity < this.config.precision && absDelta < this.config.precision) {
      this.position = this.target
      this.velocity = 0
      this.animating = false

      this.sink.event(time, this.target)

      if (this.sourceEnded) {
        this.sink.end(time)
      }
      return
    }

    // Spring physics calculation
    const acceleration = this.config.stiffness * delta - this.config.damping * this.velocity

    // Update state
    this.velocity += acceleration * this.dt
    this.position += this.velocity * this.dt

    this.sink.event(time, this.position)

    this.scheduler.paint(this)
  }
}

export interface IMotionCurry {
  (config: Partial<MotionConfig>, position: IStream<number>): IStream<number>
  (config: Partial<MotionConfig>): (position: IStream<number>) => IStream<number>
}
