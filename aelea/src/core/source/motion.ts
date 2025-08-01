import { disposeBoth, type IStream, map, type Scheduler, type Sink } from '../../stream/index.js'

interface MotionConfig {
  stiffness: number
  damping: number
  precision: number
}

type MotionState = {
  velocity: number
  position: number
}

export const MOTION_NO_WOBBLE = { stiffness: 170, damping: 26, precision: 0.01 }
export const MOTION_GENTLE = { stiffness: 120, damping: 14, precision: 0.01 }
export const MOTION_WOBBLY = { stiffness: 180, damping: 12, precision: 0.01 }
export const MOTION_STIFF = { stiffness: 210, damping: 20, precision: 0.01 }

/**
 * Adapting to motion changes using "spring physics"
 *
 * @param motionEnvironment - config spring metrics.
 *  noWobble =  stiffness 170 damping 26
 *  gentle =    stiffness 120 damping 14
 *  wobbly =    stiffness 180 damping 12
 *  stiff =     stiffness 210 damping 20
 *
 * @param initial - animation starting position to animate from
 * @param change - stream of target positions
 *
 * @see modified-from https://github.com/chenglou/react-motion/blob/master/src/stepper.js
 */
export const motion = (
  motionEnvironment: Partial<MotionConfig>,
  initial: number,
  change: IStream<number>
): IStream<number> => {
  const motionEnv = { ...MOTION_STIFF, ...motionEnvironment }
  const state = motionState(motionEnv, { position: initial, velocity: 0 }, change)
  return map((s) => s.position, state)
}

/**
 * Motion with velocity feedback (for reanimation)
 */
export const motionState = (
  motionEnvironment: Partial<MotionConfig>,
  initialState: MotionState,
  change: IStream<number>
): IStream<MotionState> => {
  const motionEnv = { ...MOTION_STIFF, ...motionEnvironment }

  return {
    run(scheduler: Scheduler, sink: Sink<MotionState>) {
      const motionSink = new MotionSink(scheduler, sink, motionEnv, initialState)
      const currentDisposable = change.run(scheduler, motionSink)

      return disposeBoth(motionSink, currentDisposable)
    }
  }
}

class MotionSink implements Sink<number>, Disposable {
  static readonly FPS = 1 / 60

  private animationDisposable: Disposable | null = null
  private currentTarget: number | null = null
  private readonly state: MotionState

  constructor(
    private readonly scheduler: Scheduler,
    private readonly sink: Sink<MotionState>,
    private readonly motionEnv: MotionConfig,
    initialState: MotionState
  ) {
    this.state = { ...initialState }
    // Emit initial state
    this.sink.event(this.state)
  }

  event(target: number): void {
    this.currentTarget = target
    // Cancel any ongoing animation
    this.animationDisposable?.[Symbol.dispose]()
    // Start new animation
    this.animationDisposable = this.scheduler.immediate(() => this.animate())
  }

  error(e: any): void {
    this.sink.error(e)
  }

  end(): void {
    this[Symbol.dispose]()
    this.sink.end()
  }

  private animate(): void {
    if (this.currentTarget === null) return

    const delta = this.currentTarget - this.state.position

    // Spring force: F_spring = -k * x
    const spring = this.motionEnv.stiffness * delta
    // Damping force: F_damper = -b * v
    const damper = this.motionEnv.damping * this.state.velocity

    // Total force = F_spring + F_damper
    // Acceleration = F / m (mass = 1)
    const acceleration = spring - damper

    // Update velocity and position
    const newVelocity = this.state.velocity + acceleration * MotionSink.FPS
    const newPosition = this.state.position + newVelocity * MotionSink.FPS

    // Check if animation has settled
    const settled = Math.abs(newVelocity) < this.motionEnv.precision && Math.abs(delta) < this.motionEnv.precision

    if (settled) {
      this.state.position = this.currentTarget
      this.state.velocity = 0
    } else {
      this.state.velocity = newVelocity
      this.state.position = newPosition
    }

    // state.velocity = newVelocity
    // state.position = settled ? target : newPosition

    // Emit the current state
    this.sink.event(this.state)

    // Continue animation if not settled
    if (!settled) {
      this.animationDisposable = this.scheduler.immediate(() => this.animate())
    }
  }

  [Symbol.dispose](): void {
    this.animationDisposable?.[Symbol.dispose]()
  }
}
