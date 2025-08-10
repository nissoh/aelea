import { curry2, disposeNone, type ISink, type IStream } from '../../stream/index.js'
import { propagateRunEventTask } from '../../stream/scheduler/PropagateTask.js'
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
    return stream((sink, scheduler) => new MotionSink(sink, scheduler as I$Scheduler, cfg, position))
  }
)

class MotionSink implements ISink<number>, Disposable {
  position = 0
  target = 0
  velocity = 0

  animating = false
  rafDisposable = disposeNone
  sourceDisposable: Disposable
  initialized = false

  constructor(
    readonly sink: ISink<number>,
    readonly scheduler: I$Scheduler,
    readonly config: MotionConfig,
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
      this.rafDisposable = this.scheduler.paint(propagateRunEventTask(this.sink, this.scheduler, animate, this))
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

  [Symbol.dispose](): void {
    this.rafDisposable[Symbol.dispose]()
    this.sourceDisposable[Symbol.dispose]()

    this.sourceDisposable = disposeNone
  }
}

function animate(sink: ISink<number>, ms: MotionSink): void {
  const delta = ms.target - ms.position
  const absDelta = delta < 0 ? -delta : delta
  const absVelocity = ms.velocity < 0 ? -ms.velocity : ms.velocity

  // Check if settled
  if (absVelocity < ms.config.precision && absDelta < ms.config.precision) {
    ms.position = ms.target
    ms.velocity = 0
    ms.animating = false
    ms.rafDisposable = disposeNone

    sink.event(ms.target)

    if (ms.sourceDisposable === disposeNone) {
      sink.end()
      return
    }

    return
  }

  // Spring physics calculation
  const acceleration = ms.config.stiffness * delta - ms.config.damping * ms.velocity

  // Update state (dt = 1/60 for 60fps)
  ms.velocity += acceleration * 0.01666666666666666 // 1/60
  ms.position += ms.velocity * 0.01666666666666666

  sink.event(ms.position)
  ms.rafDisposable = ms.scheduler.paint(propagateRunEventTask(ms.sink, ms.scheduler, animate, ms))
}

export interface IMotionCurry {
  (config: Partial<MotionConfig>, position: IStream<number>): IStream<number>
  (config: Partial<MotionConfig>): (position: IStream<number>) => IStream<number>
}
