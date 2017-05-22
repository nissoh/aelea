
import { Task, Scheduler, Sink, Time, Stream, Disposable } from '@most/types'
import { remove, findIndex } from '@most/prelude'
import { newDefaultScheduler } from '@most/scheduler/type-definitions'
import { NodeStreamLike } from './'

export class RequestFrameTask<T> implements Task {
  frameId: number = -1
  constructor (private sink: Sink<T>, private scheduler: Scheduler, private value: T) { }

  run (): this {
    if (this.frameId !== -1) return this

    this.frameId = requestAnimationFrame((time) =>
      this.sink.event(this.scheduler.now(), this.value)
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

export const requestFrameTask = <T>(sink: Sink<T>, scheduler: Scheduler, value: T) => new RequestFrameTask(sink ,scheduler, value)
