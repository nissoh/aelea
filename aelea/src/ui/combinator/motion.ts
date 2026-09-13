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

const STEP_MS = 1000 / 60
const STEP_S = STEP_MS / 1000

// A hidden tab throttles timers to a second or more, and a busy frame can
// arrive just as late. Simulate at most this much per tick: enough that a UI
// spring finishes within the first throttled tick — so it is settled, not
// half-way, when the tab is looked at again — without turning a long absence
// into an unbounded burst of integration.
const MAX_CATCHUP_MS = 1000

/**
 * Animates value changes with spring physics, stepping on a frame-length
 * delay (paint tasks scheduled during a paint flush run in the same frame by
 * contract, so they cannot step an animation).
 *
 * Integration runs in fixed 1/60s steps and consumes the real elapsed time,
 * so the spring keeps its tuned feel and its wall-clock duration whatever
 * rate the host calls back at. The step is fixed because explicit
 * integration of a spring is only stable below `2 / damping` seconds:
 * `MOTION_SNAP` (damping 80) diverges above 25ms, which a throttled
 * background tab hands out routinely.
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
  lastTime = 0
  accumulator = 0
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
    this.accumulator = 0
    this.schedule()
  }

  schedule(): void {
    this.pendingTask = this.scheduler.delay(this, STEP_MS)
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
    this.accumulator = Math.min(this.accumulator + Math.max(time - this.lastTime, 0), MAX_CATCHUP_MS)
    this.lastTime = time

    const config = this.config
    let stepped = false

    while (this.accumulator >= STEP_MS) {
      this.accumulator -= STEP_MS
      const delta = this.target - this.position

      if (Math.abs(this.velocity) < config.precision && Math.abs(delta) < config.precision) {
        this.position = this.target
        this.velocity = 0
        this.animating = false
        this.accumulator = 0

        this.sink.event(time, this.target)

        if (this.sourceEnded) this.sink.end(time)
        return
      }

      this.velocity += (config.stiffness * delta - config.damping * this.velocity) * STEP_S
      this.position += this.velocity * STEP_S
      stepped = true
    }

    if (stepped) this.sink.event(time, this.position)

    this.schedule()
  }
}

export interface IMotionCurry {
  (config: Partial<MotionConfig>, position: IStream<number>): IStream<number>
  (config: Partial<MotionConfig>): (position: IStream<number>) => IStream<number>
}
