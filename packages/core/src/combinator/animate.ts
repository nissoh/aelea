
import { Scheduler, Sink, Stream, Disposable } from '@most/types'
import { currentTime, } from '@most/scheduler'
import { skipAfter, scan, map, continueWith, constant, switchLatest } from '@most/core'
import { O } from 'src/utils'
import { disposeWith } from '@most/disposable'
import { Op } from 'src/types'
import { compose } from '@most/prelude'

// copied & modified from https://github.com/mostjs/x-animation-frame/tree/master
export type RafHandlerId = number
export type RafHandler = (dts: RafHandlerId) => void


export type AnimationFrameRequestTime = number
export type AnimationFrameResponseTime = number

export interface AnimationFrame {
  requestTime: AnimationFrameRequestTime,
  responseTime: AnimationFrameResponseTime
}

export type AnimationFrames = {
  requestAnimationFrame: (f: RafHandler) => AnimationFrameRequestTime,
  cancelAnimationFrame: (f: AnimationFrameRequestTime) => void
}

class AnimationFrameSource {
  constructor(
    private afp: AnimationFrames
  ) { }

  run(sink: Sink<AnimationFrame>, scheduler: Scheduler): Disposable {
    const requestTime = currentTime(scheduler)
    const propagate: RafHandler = () => eventThenEnd(requestTime, currentTime(scheduler), sink)
    const request = this.afp.requestAnimationFrame(propagate)
    return disposeWith(fid => this.afp.cancelAnimationFrame(fid), request)
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
  switchLatest as any,
  map(x => constant(x, nextAnimationFrame(window))),
) as <A>(x: Stream<A>) => Stream<A>


interface Motion {
  stiffness: number
  damping: number
}

/*
// Applying motion using "spring physics"
// noWobble  stiffness 170 damping 26
// gentle    stiffness 120 damping 14
// wobbly    stiffness 180 damping 12
// stiff     stiffness 210 damping 20

// modified from
// https://github.com/chenglou/react-motion/blob/master/src/stepper.js
*/
export const motion = ({ stiffness = 210, damping = 20 }: Partial<Motion> = {}) => {

  const motionState = Object.freeze({ position: 0, velocity: 0 })

  const motionOp: Op<AnimationFrame, number> = O(
    scan((state, { requestTime, responseTime }: AnimationFrame) => {

      const frameRate = (responseTime - requestTime) / 1000;

      // this the spring magic in the loop - for example the x property of an object
      // spring & damper from k (stiffness) and b (damping constant)
      const springX = stiffness * (1 - state.position);
      const damperX = damping * state.velocity;

      // usually we put mass here, but for animation purposes, specifying mass is a
      // bit redundant. you could simply adjust k and b accordingly
      const acceleration = springX - damperX;

      const velocity = state.velocity + (acceleration * frameRate);
      const position = state.position + (velocity * frameRate);

      // rest
      if (Math.abs(state.position - 1) < 0.001) {
        return { position: 1, velocity: 1 }
      } else {
        return { position, velocity }
      }

    }, motionState),
    skipAfter(state =>
      state.position === 1
    ),
    map(state => state.position)
  )

  return motionOp(animationFrames(window))
}


