
import { Scheduler, Sink, Time, Stream, Disposable } from '@most/types'
import { currentTime, } from '@most/scheduler'
import { skipAfter, scan, map, take, throttle } from '@most/core'
import { O } from 'src/utils'


export type RafEvent = Readonly<[Time, Time]>
class RquestFrameTask implements Disposable {

  private requestTime = -1;
  private requestId = -1;

  constructor(
    private readonly sink: Sink<RafEvent>,
    private readonly scheduler: Scheduler
  ) { }

  run(): Disposable {
    this.requestTime = currentTime(this.scheduler)
    this.requestId = requestAnimationFrame(this.eventBound)

    return this;
  }

  dispose(): void {
    cancelAnimationFrame(this.requestId)
  }

  private eventBound = (): void => {
    const requestTime = this.requestTime
    this.run()
    const now = this.requestTime

    this.sink.event(now, [requestTime, now])
  }

}


class ThrottleSink<T> implements Sink<T> {

  private requestId = -1;
  private latestValue!: T

  constructor(private sink: Sink<T>, private scheduler: Scheduler) {

  }

  event(_time: number, value: T) {
    this.latestValue = value

    if (this.requestId > -1) {
      this.dispose(this.requestId)
    }

    this.requestId = requestAnimationFrame(this.eventBound)
  }

  end(time: number) {
    if (this.requestId > -1) {
      this.dispose(this.requestId)
    }

    this.sink.end(time)
  }

  error(time: number, err: Error) {
    this.error(time, err)
  }

  dispose(id: number) {
    cancelAnimationFrame(id)
  }


  private eventBound = (): void => {
    const now = currentTime(this.scheduler)
    this.sink.event(now, this.latestValue)

    this.requestId = -1
  }

}

class ThrottleRaf<T> {
  static maxFPS = (1000 / 60) / 1000

  constructor(private readonly source: Stream<T>) { }

  run(sink: Sink<any>, scheduler: Scheduler): Disposable {
    return throttle(ThrottleRaf.maxFPS, this.source).run(new ThrottleSink(sink, scheduler), scheduler)
  }
}

// - throttle source to 60 fps
// - propogate using raf(request animation frame)
// - discard frames that were not propogated by raf
export const throttleRaf = <T>(source: Stream<T>) => new ThrottleRaf(source)

// recursive reuqest for frame(AKA stepper(i think))
export const raf: Stream<RafEvent> = {
  run(sink: Sink<any>, scheduler: Scheduler): Disposable {
    const disposable = new RquestFrameTask(sink, scheduler).run()
    return disposable;
  }
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
export const motion = (
  stiffness = 210,
  damping = 20,
) => {

  const motionState = Object.freeze({ position: 0, velocity: 0 })

  const motionOp = O(
    scan((state, [requestTime, frameTime]: RafEvent) => {

      const frameRate = (frameTime - requestTime) / 1000;

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
    map(state => state.position),
    take(1000)
  )

  return motionOp(raf)
}



