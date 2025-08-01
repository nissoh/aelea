import { type IStream, map, type Scheduler, type Sink } from '../../stream/index.js'

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

// Animation step function - mutates state for performance
function animate(motionEnv: MotionConfig, state: MotionState, target: number): boolean {
  const delta = target - state.position

  // Spring force: F_spring = -k * x
  const spring = motionEnv.stiffness * delta
  // Damping force: F_damper = -b * v
  const damper = motionEnv.damping * state.velocity

  // Total force = F_spring + F_damper
  // Acceleration = F / m (mass = 1)
  const acceleration = spring - damper

  // Update velocity and position
  const newVelocity = state.velocity + acceleration * (1 / 60)
  const newPosition = state.position + newVelocity * (1 / 60)

  // Check if animation has settled
  const settled = Math.abs(newVelocity) < motionEnv.precision && Math.abs(delta) < motionEnv.precision

  if (settled) {
    state.position = target
    state.velocity = 0
  } else {
    state.velocity = newVelocity
    state.position = newPosition
  }

  return settled
}

/**
 * Adapting to motion changes using "spring physics"
 *
 * @param motionEnvironment - config spring metrics.
 *  noWobble =  stiffness 170 damping 26
 *  gentle =    stiffness 120 damping 14
 *  wobbly =    stiffness 180 damping 12
 *  stiff =     stiffness 210 damping 20
 *
 * @param from - animation starting position
 * @param to - target position to animate to
 *
 * @see modified-from https://github.com/chenglou/react-motion/blob/master/src/stepper.js
 */
export const motion = (motionEnvironment: Partial<MotionConfig>, from: number, to: number): IStream<number> => {
  const motionEnv = { ...MOTION_STIFF, ...motionEnvironment }
  const state = motionState(motionEnv, { position: from, velocity: 0 }, to)
  return map((s) => s.position, state)
}

/**
 * Motion with velocity feedback (for reanimation)
 */
export const motionState = (
  motionEnvironment: Partial<MotionConfig>,
  initialState: MotionState,
  target: number
): IStream<MotionState> => {
  const motionEnv = { ...MOTION_STIFF, ...motionEnvironment }

  return {
    run(scheduler: Scheduler, sink: Sink<MotionState>) {
      return new MotionTask(scheduler, sink, motionEnv, initialState, target)
    }
  }
}

class MotionTask implements Disposable {
  private animationDisposable: Disposable | null = null
  private readonly state: MotionState
  private disposed = false

  constructor(
    private readonly scheduler: Scheduler,
    private readonly sink: Sink<MotionState>,
    private readonly motionEnv: MotionConfig,
    initialState: MotionState,
    private readonly target: number
  ) {
    this.state = { ...initialState }
    // Emit initial state
    this.sink.event(this.state)
    // Start animation
    this.scheduleNext(this.sink)
  }

  private scheduleNext = (sink: Sink<MotionState>): void => {
    if (this.disposed) return

    const settled = animate(this.motionEnv, this.state, this.target)

    // Emit current state
    sink.event(this.state)

    if (settled) {
      // Animation complete
      sink.end()
    } else {
      // Continue animation
      this.animationDisposable = this.scheduler.asap(sink, this.scheduleNext)
    }
  };

  [Symbol.dispose](): void {
    this.disposed = true
    this.animationDisposable?.[Symbol.dispose]()
  }
}
