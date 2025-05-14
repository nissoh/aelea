import { constant, continueWith, loop, map, skipAfter, startWith, switchLatest } from '@most/core'
import { disposeWith } from '@most/disposable'
import { curry3 } from '@most/prelude'
import { currentTime } from '@most/scheduler'
import type { Disposable, Scheduler, Sink, Stream } from '@most/types'
import { O } from '../../core/common.js'

type RafHandlerId = number
type RafHandler = (dts: RafHandlerId) => void

type AnimationFrameRequestTime = number
type AnimationFrameResponseTime = number

interface AnimationFrame {
  requestTime: AnimationFrameRequestTime
  responseTime: AnimationFrameResponseTime
}

export type AnimationFrames = {
  requestAnimationFrame: (f: RafHandler) => AnimationFrameRequestTime
  cancelAnimationFrame: (f: AnimationFrameRequestTime) => void
}

// copied & modified from https://github.com/mostjs/x-animation-frame/tree/master
class AnimationFrameSource {
  constructor(private readonly afp: AnimationFrames) {}

  run(sink: Sink<AnimationFrame>, scheduler: Scheduler): Disposable {
    const requestTime = currentTime(scheduler)
    const propagate: RafHandler = () => eventThenEnd(requestTime, currentTime(scheduler), sink)
    const rafId = this.afp.requestAnimationFrame(propagate)
    return disposeWith((fid) => this.afp.cancelAnimationFrame(fid), rafId)
  }
}

const eventThenEnd = (
  requestTime: AnimationFrameRequestTime,
  responseTime: AnimationFrameResponseTime,
  sink: Sink<AnimationFrame>
) => {
  sink.event(requestTime, { requestTime, responseTime })
  sink.end(requestTime)
}

export const nextAnimationFrame = (afp: AnimationFrames = window): Stream<AnimationFrame> =>
  new AnimationFrameSource(afp)

export const animationFrames = (afp: AnimationFrames = window): Stream<AnimationFrame> =>
  continueWith(() => animationFrames(afp), nextAnimationFrame(afp))

export const drawLatest = O(
  map((x) => constant(x, nextAnimationFrame(window))),
  switchLatest
) as <A>(x: Stream<A>) => Stream<A>

interface Motion {
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
 * adapting to motion changes using "spring physics"
 *
 * @param initialPositon - animation starting position to animate from
 * @param motionEnvironment - config spring metrics.
 *
 *  noWobble =  stiffness 170 damping 26
 *
 *  gentle =    stiffness 120 damping 14
 *
 *  wobbly =    stiffness 180 damping 12
 *
 *  stiff =     stiffness 210 damping 20
 *
 *  @see  modified-from https://github.com/chenglou/react-motion/blob/master/src/stepper.js
 */
export const motion = curry3(
  (motionEnvironment: Partial<Motion>, initialState: number, change: Stream<number>): Stream<number> => {
    const motionEnv = { ...MOTION_STIFF, ...motionEnvironment }
    const ma = motionState(motionEnv, { position: initialState, velocity: 0 }, change)
    return map((s) => s.position, ma)
  }
)

// used in cases where velocity feedback is needed(for renimation)
export const motionState = curry3(
  (motionEnvironment: Partial<Motion>, initialState: MotionState, change: Stream<number>): Stream<MotionState> => {
    const motionEnv = { ...MOTION_STIFF, ...motionEnvironment }

    return O(
      loop((seed: MotionState, target: number) => {
        const frames = O(
          map(() => stepFrame(target, seed, motionEnv)),
          skipAfter((n) => n.position === target)
        )
        return { seed, value: frames(animationFrames()) }
      }, initialState),
      switchLatest,
      startWith(initialState)
    )(change)
  }
)

function stepFrame(target: number, state: MotionState, motionEnv: Motion) {
  const fps = 1 / 60
  const delta = target - state.position

  const spring = motionEnv.stiffness * delta
  const damper = motionEnv.damping * state.velocity

  const acceleration = spring - damper

  const newVelocity = state.velocity + acceleration * fps
  const newPosition = state.position + newVelocity * fps

  const settled = Math.abs(newVelocity) < motionEnv.precision && Math.abs(delta) < motionEnv.precision

  state.velocity = newVelocity
  state.position = settled ? target : newPosition

  return state
}
