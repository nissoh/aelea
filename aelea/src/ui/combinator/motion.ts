import { curry2, disposeNone, type IScheduler, type ISink, type IStream } from '../../stream/index.js'
import { propagateRunEventTask } from '../../stream/scheduler/PropagateTask.js'
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
 * Stream that animates value changes using spring physics
 */
class Motion implements IStream<number> {
  constructor(
    readonly config: MotionConfig,
    readonly position: IStream<number>
  ) {}

  run(sink: ISink<number>, scheduler: IScheduler): Disposable {
    return new MotionSink(sink, scheduler as I$Scheduler, this.config, this.position)
  }
}

/**
 * Animates value changes using spring physics
 */
export const motion: IMotionCurry = curry2(
  (config: Partial<MotionConfig>, position: IStream<number>): IStream<number> => {
    const cfg = { ...MOTION_NO_WOBBLE, ...config }
    return new Motion(cfg, position)
  }
)

class MotionSink implements ISink<number>, Disposable {
  position = 0
  target = 0
  velocity = 0
  animating = false
  initialized = false
  rafDisposable = disposeNone
  sourceEnded = false
  sourceDisposable: Disposable
  readonly dt = 0.016666666666666666 // 1/60

  constructor(
    readonly sink: ISink<number>,
    readonly scheduler: I$Scheduler,
    readonly config: MotionConfig,
    position: IStream<number>
  ) {
    this.sourceDisposable = position.run(this, scheduler)
  }

  event(target: number): void {
    this.target = target

    if (!this.initialized) {
      this.initialized = true
      this.position = target
      this.sink.event(target)
    }

    if (!this.animating) {
      this.animating = true
      this.rafDisposable = this.scheduler.paint(propagateRunEventTask(this.sink, animate, this))
    }
  }

  error(err: unknown): void {
    this.sink.error(err)
  }

  end(): void {
    this.sourceEnded = true

    if (this.animating) return

    this.rafDisposable[Symbol.dispose]()
    this.sink.end()
  }

  [Symbol.dispose](): void {
    this.rafDisposable[Symbol.dispose]()
    this.sourceDisposable[Symbol.dispose]()
  }
}

function animate(sink: ISink<number>, ms: MotionSink): void {
  const delta = ms.target - ms.position
  const absDelta = Math.abs(delta)
  const absVelocity = Math.abs(ms.velocity)

  // Check if settled
  if (absVelocity < ms.config.precision && absDelta < ms.config.precision) {
    ms.position = ms.target
    ms.velocity = 0
    ms.animating = false
    ms.rafDisposable = disposeNone

    sink.event(ms.target)

    if (ms.sourceEnded) {
      sink.end()
    }
    return
  }

  // Spring physics calculation
  const acceleration = ms.config.stiffness * delta - ms.config.damping * ms.velocity

  // Update state
  ms.velocity += acceleration * ms.dt
  ms.position += ms.velocity * ms.dt

  sink.event(ms.position)
  ms.rafDisposable = ms.scheduler.paint(propagateRunEventTask(sink, animate, ms))
}

export interface IMotionCurry {
  (config: Partial<MotionConfig>, position: IStream<number>): IStream<number>
  (config: Partial<MotionConfig>): (position: IStream<number>) => IStream<number>
}
