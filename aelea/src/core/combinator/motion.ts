import type { IScheduler, ISink, IStream } from '../../stream/index.js'
import { stream } from '../stream.js'

interface MotionConfig {
  stiffness: number
  damping: number
  precision: number
}

interface MotionState {
  position: number
  target: number
  velocity: number
}

export const MOTION_NO_WOBBLE = { stiffness: 170, damping: 26, precision: 0.01 }
export const MOTION_GENTLE = { stiffness: 120, damping: 14, precision: 0.01 }
export const MOTION_WOBBLY = { stiffness: 180, damping: 12, precision: 0.01 }
export const MOTION_STIFF = { stiffness: 210, damping: 20, precision: 0.01 }

/**
 * Motion combinator that animates position changes from an input stream
 *
 * @param config - Spring animation configuration
 * @param position - Stream of target positions to animate to
 * @returns Stream of animated positions
 *
 * @example
 * const targetPositions$ = stream(sink => {
 *   sink.event(0)    // Start at 0
 *   setTimeout(() => sink.event(100), 1000)  // Animate to 100
 *   setTimeout(() => sink.event(50), 2000)   // Animate to 50
 * })
 *
 * const animated$ = motion(MOTION_GENTLE)(targetPositions$)
 * // Emits smooth transitions: 0 -> 1 -> 2 -> ... -> 100 -> 99 -> ... -> 50
 */
export function motion(position: IStream<number>, config?: Partial<MotionConfig>): IStream<number> {
  const motionConfig = { ...MOTION_NO_WOBBLE, ...config }

  return stream((scheduler, sink) => new MotionSink(scheduler, sink, motionConfig, position))
}

class MotionSink implements ISink<number>, Disposable {
  private state: MotionState | null = null
  
  private animationDisposable: Disposable | null = null
  private sourceDisposable: Disposable | null = null
  private disposed = false
  private isAnimating = false

  constructor(
    private scheduler: IScheduler,
    private sink: ISink<number>,
    private config: MotionConfig,
    positions$: IStream<number>
  ) {
    // Subscribe to position changes
    this.sourceDisposable = positions$.run(scheduler, this)
  }

  event(targetPosition: number): void {
    if (this.disposed) return

    if (this.state === null) {
      // First position - initialize state
      this.state = {
        position: targetPosition,
        target: targetPosition,
        velocity: 0
      }
      // Emit initial position immediately
      this.sink.event(targetPosition)
    } else {
      // Update target and start/continue animation
      this.state.target = targetPosition
      if (!this.isAnimating) {
        this.startAnimation()
      }
    }
  }

  error(err: any): void {
    if (!this.disposed) {
      this.sink.error(err)
      this.dispose()
    }
  }

  end(): void {
    // Let current animation finish before ending
    if (!this.disposed && !this.isAnimating) {
      this.sink.end()
      this.dispose()
    }
  }

  private startAnimation(): void {
    if (this.disposed || !this.state) return

    this.isAnimating = true
    this.scheduleNextFrame()
  }

  private scheduleNextFrame = (): void => {
    if (this.disposed || !this.state) return

    const settled = this.animateFrame()

    // Emit current position
    this.sink.event(this.state.position)

    if (settled) {
      this.isAnimating = false
      this.animationDisposable = null

      // If source has ended and animation is complete, end the stream
      if (this.sourceDisposable === null) {
        this.sink.end()
        this.dispose()
      }
    } else {
      // Continue animation using delay for next frame (16ms ~ 60fps)
      this.animationDisposable = this.scheduler.delay(this.sink as any, this.scheduleNextFrame, 16)
    }
  }

  private animateFrame(): boolean {
    if (!this.state) return true

    const delta = this.state.target - this.state.position

    // Spring physics
    const spring = this.config.stiffness * delta
    const damper = this.config.damping * this.state.velocity
    const acceleration = spring - damper

    // Update velocity and position (assuming 60fps)
    const dt = 1 / 60
    this.state.velocity += acceleration * dt
    this.state.position += this.state.velocity * dt

    // Check if animation has settled
    const settled = Math.abs(this.state.velocity) < this.config.precision && Math.abs(delta) < this.config.precision

    if (settled) {
      this.state.position = this.state.target
      this.state.velocity = 0
    }

    return settled
  }

  dispose(): void {
    if (this.disposed) return
    this.disposed = true

    this.animationDisposable?.[Symbol.dispose]?.()
    this.sourceDisposable?.[Symbol.dispose]?.()

    this.state = null
    this.animationDisposable = null
    this.sourceDisposable = null
  }

  [Symbol.dispose](): void {
    this.dispose()
  }
}
