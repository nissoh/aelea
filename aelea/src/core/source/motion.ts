import { curry2, type ISink, type IStream } from '../../stream/index.js'
import { stream } from '../stream.js'
import type { I$Scheduler } from '../types.js'

interface MotionConfig {
  stiffness: number
  damping: number
  precision: number
}

type MotionState = {
  position: number
  target: number
  velocity: number
}

type MotionStateInput = {
  position: number
  target: number
  velocity?: number
}

export const MOTION_NO_WOBBLE = { stiffness: 170, damping: 26, precision: 0.01 }
export const MOTION_GENTLE = { stiffness: 120, damping: 14, precision: 0.01 }
export const MOTION_WOBBLY = { stiffness: 180, damping: 12, precision: 0.01 }
export const MOTION_STIFF = { stiffness: 210, damping: 20, precision: 0.01 }

// export const motion = (motionEnvironment: Partial<MotionConfig>, from: number, to: number): IStream<number> => {
//   const motionEnv = { ...MOTION_STIFF, ...motionEnvironment }
//   const state = motion(motionEnv, { position: from, velocity: 0, target: to })
//   return map((s) => s.position, state)
// }

export interface IMotionCurry {
  (motionEnvironment: Partial<MotionConfig>, state: MotionStateInput): IStream<Readonly<MotionState>>
  (motionEnvironment: Partial<MotionConfig>): (state: MotionStateInput) => IStream<Readonly<MotionState>>
}

/**
 * Motion with velocity feedback (for reanimation)
 */
export const motion: IMotionCurry = curry2((motionEnvironment: Partial<MotionConfig>, state: MotionStateInput) => {
  const motionEnv = { ...MOTION_STIFF, ...motionEnvironment }
  const initialState: MotionState = {
    position: state.position,
    target: state.target,
    velocity: state.velocity ?? 0
  }
  return stream((scheduler, sink) => new MotionTask(scheduler, sink, motionEnv, initialState))
})

class MotionTask implements Disposable {
  private animationDisposable: Disposable | null = null
  private readonly state: MotionState
  private disposed = false

  constructor(
    private readonly scheduler: I$Scheduler,
    private readonly sink: ISink<MotionState>,
    private readonly motionEnv: MotionConfig,
    initialState: MotionState
  ) {
    this.state = initialState
    // Emit initial state
    this.sink.event(this.state)
    // Start animation
    this.scheduleNext(this.sink)
  }

  private scheduleNext = (sink: ISink<MotionState>): void => {
    if (this.disposed) return

    const settled = animate(this.motionEnv, this.state)

    // Emit current state
    sink.event(this.state)

    if (settled) {
      // Animation complete
      sink.end()
    } else {
      // Continue animation
      this.animationDisposable = this.scheduler.paint(sink, this.scheduleNext)
    }
  };

  [Symbol.dispose](): void {
    this.disposed = true
    this.animationDisposable?.[Symbol.dispose]()
  }
}

function animate(motionEnv: MotionConfig, state: MotionState): boolean {
  const delta = state.target - state.position

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
    state.position = state.target
    state.velocity = 0
  } else {
    state.velocity = newVelocity
    state.position = newPosition
  }

  return settled
}
