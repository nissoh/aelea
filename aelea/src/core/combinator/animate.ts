import { continueWith, disposeWith, map, op, startWith, switchLatest } from '../../stream/index.js'
import type { IStream, Sink } from '../../stream/types.js'

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
function createAnimationFrameSource(afp: AnimationFrames): IStream<AnimationFrame> {
  return {
    run(scheduler, sink) {
      const requestTime = scheduler.currentTime()
      const propagate: RafHandler = () => eventThenEnd(requestTime, sink)
      const rafId = afp.requestAnimationFrame(propagate)
      return disposeWith((fid) => afp.cancelAnimationFrame(fid), rafId)
    }
  }
}

const eventThenEnd = (
  requestTime: AnimationFrameRequestTime,
  responseTime: AnimationFrameResponseTime,
  sink: Sink<AnimationFrame>
) => {
  sink.event({ requestTime, responseTime })
  sink.end()
}

export const nextAnimationFrame = (afp: AnimationFrames = window): IStream<AnimationFrame> =>
  createAnimationFrameSource(afp)

export const animationFrames = (afp: AnimationFrames = window): IStream<AnimationFrame> =>
  continueWith(() => animationFrames(afp))(nextAnimationFrame(afp))

export const drawLatest = <A>(x: IStream<A>): IStream<A> =>
  op(
    x,
    map((value: A) => map(() => value)(nextAnimationFrame(window))),
    switchLatest
  )

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
export const motion = (
  motionEnvironment: Partial<Motion>,
  initialState: number,
  change: IStream<number>
): IStream<number> => {
  const motionEnv = { ...MOTION_STIFF, ...motionEnvironment }
  return map((s: MotionState) => s.position)(motionState(motionEnv, { position: initialState, velocity: 0 }, change))
}

// used in cases where velocity feedback is needed(for renimation)
export const motionState = (
  motionEnvironment: Partial<Motion>,
  initialState: MotionState,
  change: IStream<number>
): IStream<MotionState> => {
  const motionEnv = { ...MOTION_STIFF, ...motionEnvironment }

  const seed: MotionState = { ...initialState }

  return op(
    change,
    map((target) => {
      return op(
        animationFrames(),
        map(() => {
          const state = stepFrame(target, seed, motionEnv)
          // Copy state to seed for next iteration
          seed.position = state.position
          seed.velocity = state.velocity
          return state
        }),
        // Continue until we reach the target position
        (stream): IStream<MotionState> => ({
          run(scheduler, sink) {
            let done = false
            const disposable = stream.run(scheduler, {
              event(value: MotionState) {
                sink.event(value)
                if (value.position === target) {
                  done = true
                  sink.end()
                }
              },
              error(e: any) {
                sink.error(e)
              },
              end() {
                if (!done) sink.end()
              }
            })
            return disposable
          }
        })
      )
    }),
    switchLatest,
    startWith(initialState)
  )
}

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
