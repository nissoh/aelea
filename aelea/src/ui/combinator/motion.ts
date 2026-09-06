import {
  curry2,
  disposeBoth,
  type IScheduler,
  type ISink,
  type IStream,
  type ITime,
  PropagateTask
} from '../../stream/index.js'

export interface MotionConfig {
  stiffness: number
  damping: number
  precision: number
}

export const MOTION_NO_WOBBLE = { stiffness: 170, damping: 26, precision: 0.01 }
export const MOTION_GENTLE = { stiffness: 120, damping: 14, precision: 0.01 }
export const MOTION_WOBBLY = { stiffness: 180, damping: 12, precision: 0.01 }
export const MOTION_STIFF = { stiffness: 210, damping: 20, precision: 0.01 }
export const MOTION_SNAP = { stiffness: 800, damping: 80, precision: 0.01 }

const FRAME_MS = 1000 / 60
const MAX_STEP_S = 1 / 30

/**
 * Animates value changes with spring physics. Steps on a frame-length delay,
 * which means "the next frame" on every scheduler (paint tasks scheduled
 * during a paint flush run in the same frame by contract, so they cannot
 * step an animation). Integration uses the real elapsed time, clamped, so a
 * late frame does not launch the spring.
 */
export const motion: IMotionCurry = curry2(
  (config: Partial<MotionConfig>, position: IStream<number>): IStream<number> => {
    const cfg = { ...MOTION_NO_WOBBLE, ...config }
    return new Motion(cfg, position)
  }
)

class Motion implements IStream<number> {
  constructor(
    readonly config: MotionConfig,
    readonly position: IStream<number>
  ) {}

  run(sink: ISink<number>, scheduler: IScheduler): Disposable {
    const disposableSink = new MotionSink(sink, scheduler, this.config)
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
  lastTime = -1
  pendingTask: Disposable | null = null

  constructor(
    sink: ISink<number>,
    readonly scheduler: IScheduler,
    readonly config: MotionConfig
  ) {
    super(sink)
  }

  event(time: ITime, target: number): void {
    this.target = target

    if (this.pendingTask) return

    if (!this.initialized) {
      this.initialized = true
      this.position = target
      this.sink.event(time, target)
    }

    this.animating = true
    this.lastTime = time
    this.schedule()
  }

  schedule(): void {
    this.pendingTask = this.scheduler.delay(this, FRAME_MS)
  }

  error(time: ITime, err: unknown): void {
    this.sink.error(time, err)
  }

  end(time: ITime): void {
    this.sourceEnded = true

    if (this.animating) return

    this.sink.end(time)
  }

  [Symbol.dispose](): void {
    this.active = false
    if (this.pendingTask) {
      const t = this.pendingTask
      this.pendingTask = null
      t[Symbol.dispose]()
    }
  }

  runIfActive(time: ITime): void {
    this.pendingTask = null
    const dt = Math.min(Math.max(time - this.lastTime, 0) / 1000, MAX_STEP_S) || FRAME_MS / 1000
    this.lastTime = time

    const delta = this.target - this.position

    if (Math.abs(this.velocity) < this.config.precision && Math.abs(delta) < this.config.precision) {
      this.position = this.target
      this.velocity = 0
      this.animating = false

      this.sink.event(time, this.target)

      if (this.sourceEnded) {
        this.sink.end(time)
      }
      return
    }

    const acceleration = this.config.stiffness * delta - this.config.damping * this.velocity

    this.velocity += acceleration * dt
    this.position += this.velocity * dt

    this.sink.event(time, this.position)

    this.schedule()
  }
}

export interface IMotionCurry {
  (config: Partial<MotionConfig>, position: IStream<number>): IStream<number>
  (config: Partial<MotionConfig>): (position: IStream<number>) => IStream<number>
}
