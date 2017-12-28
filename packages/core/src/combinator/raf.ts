
import { Task, Scheduler, Sink, Time, Stream, Disposable } from '@most/types'

export class RequestFrameTask<T> implements Task {
  frameId: number = -1
  constructor (private sink: Sink<T>, private scheduler: Scheduler, private value: T) { }

  run (): this {
    if (this.frameId !== -1) return this

    this.frameId = requestAnimationFrame(_ =>
      this.sink.event(this.scheduler.currentTime(), this.value)
    )

    return this
  }

  error (t: Time, e: Error) {
    this.dispose()
  }

  dispose () {
    cancelAnimationFrame(this.frameId)
  }

}

export class RequestFrame<T> implements Stream<T> {
  constructor (private source: Stream<T>) { }

  run (sink: Sink<T>, scheduler: Scheduler) {
    return new RequestFrameSink(sink, this.source, scheduler)
  }
}

export class RequestFrameSink<T> implements Sink<T> {
  frameId: number = -1
  sourceDispoable: Disposable = this.source.run(this, this.scheduler)

  constructor (private sink: Sink<T>, private source: Stream<T>, private scheduler: Scheduler) { }

  event (time: number, value: T): void {
    if (this.frameId !== -1) return

    this.frameId = requestAnimationFrame(_ => {
      this.sink.event(this.scheduler.currentTime(), value)
      this.frameId = -1
    })
  }

  end (t: Time): void {
    this.dispose()
    this.sink.end(t)
  }

  error (t: Time, e: Error) {
    this.dispose()
    this.sink.error(t, e)
  }

  dispose () {
    this.sourceDispoable.dispose()
    if (this.frameId !== -1) {
      cancelAnimationFrame(this.frameId)
    }
  }
}

export const requestFrameTask = <T>(sink: Sink<T>, scheduler: Scheduler, value: T) => new RequestFrameTask(sink, scheduler, value)
export const requestFrame = <T>(s: Stream<T>) => new RequestFrame(s)
