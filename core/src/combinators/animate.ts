
import { Scheduler, Sink, Stream, Disposable } from '@most/types'
import { currentTime, } from '@most/scheduler'
import { skipAfter, map, continueWith, constant, switchLatest, loop, filter, tap, now } from '@most/core'
import { O } from '../utils'
import { disposeWith } from '@most/disposable'
import { compose, curry2 } from '@most/prelude'
import { $Branch, IBranchElement, StyleCSS } from '../types'

type RafHandlerId = number
type RafHandler = (dts: RafHandlerId) => void


type AnimationFrameRequestTime = number
type AnimationFrameResponseTime = number

export interface AnimationFrame {
  requestTime: AnimationFrameRequestTime,
  responseTime: AnimationFrameResponseTime
}

export type AnimationFrames = {
  requestAnimationFrame: (f: RafHandler) => AnimationFrameRequestTime,
  cancelAnimationFrame: (f: AnimationFrameRequestTime) => void
}

// copied & modified from https://github.com/mostjs/x-animation-frame/tree/master
class AnimationFrameSource {
  constructor(private afp: AnimationFrames) { }

  run(sink: Sink<AnimationFrame>, scheduler: Scheduler): Disposable {
    const requestTime = currentTime(scheduler)
    const propagate: RafHandler = () => eventThenEnd(requestTime, currentTime(scheduler), sink)
    const rafId = this.afp.requestAnimationFrame(propagate)
    return disposeWith(fid => this.afp.cancelAnimationFrame(fid), rafId)
  }
}

const eventThenEnd = (requestTime: AnimationFrameRequestTime, responseTime: AnimationFrameResponseTime, sink: Sink<AnimationFrame>) => {
  sink.event(requestTime, { requestTime, responseTime })
  sink.end(requestTime)
}

export const nextAnimationFrame = (afp: AnimationFrames): Stream<AnimationFrame> =>
  new AnimationFrameSource(afp)

export const animationFrames = (afp: AnimationFrames): Stream<AnimationFrame> =>
  continueWith(() => animationFrames(afp), nextAnimationFrame(afp))



export const drawLatest = compose(
  // @ts-ignore
  switchLatest,
  map(x => constant(x, nextAnimationFrame(window))),
) as <A>(x: Stream<A>) => Stream<A>


interface Motion {
  stiffness: number
  damping: number
  precision: number
}

type MotionState = {
  velocity: number,
  position: number
}


export const MOTION_NO_WOBBLE = { stiffness: 170, damping: 26, precision: .01 }
export const MOTION_GENTLE = { stiffness: 120, damping: 14, precision: .01 }
export const MOTION_WOBBLY = { stiffness: 180, damping: 12, precision: .01 }
export const MOTION_STIFF = { stiffness: 210, damping: 20, precision: .01 }

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
export const motion = curry2((motionEnvironment: Partial<Motion>, change: Stream<number>) => {
  const motionEnv = { ...MOTION_STIFF, ...motionEnvironment }

  return O(
    loop((seed: MotionState | null, target: number) => {

      if (seed === null) {
        return { seed: { position: target, velocity: 0 }, value: now(target) }
      }

      const value = O(
        animationFrames,
        map(() => stepFrame(target, seed, motionEnv).position),
        skipAfter(n => n === target)
      )(window)

      return { seed, value }
    }, null),
    switchLatest
  )(change)
})

export const styleInMotion = <A extends IBranchElement, B>(
  style: Stream<StyleCSS>,
) => ($node: $Branch<A, B>): $Branch<A, B> => {

  return map(node => {
    const applyInlineStyleStream = tap((styleObj) => {
      for (const prop in styleObj) {
        if (Object.prototype.hasOwnProperty.call(styleObj, prop)) {
          // @ts-ignore
          const val = styleObj[prop]

          // @ts-ignore
          node.element.style[prop] = val
        }
      }
    }, style)

    return { ...node, styleBehaviors: [filter(() => false, applyInlineStyleStream)] }
  }, $node)

}



function stepFrame(target: number, state: MotionState, motionEnv: Motion) {
  // const dddd = (frame.responseTime - frame.requestTime) / 1000 || (1 / 60)

  const fps = 1 / 60
  const delta = target - state.position

  const spring = motionEnv.stiffness * delta
  const damper = motionEnv.damping * state.velocity

  const acceleration = spring - damper

  const newVelocity = state.velocity + (acceleration * fps);
  const newPosition = state.position + (newVelocity * fps);

  const settled = Math.abs(newVelocity) < motionEnv.precision && Math.abs(delta) < motionEnv.precision

  state.velocity = newVelocity
  state.position = settled ? target : newPosition

  return state
}
