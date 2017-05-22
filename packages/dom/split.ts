// https://github.com/briancavalier/most-behave/blob/master/src/event/split.js
import { Stream, Disposable, Scheduler, Sink, Time } from '@most/types'
import { nullSink, nullDisposable } from './utils'

class SplitDisposable<T> implements Disposable {
  constructor (private source: any, private sink: Sink<T>) {}

  dispose () {
    if (this.sink === this.source.sink0) {
      this.source.sink0 = this.source.sink1
      this.source.sink1 = nullSink
    } else {
      this.source.sink1 = nullSink
    }

    if (this.source.sink0 === nullSink) {
      return this.source.disposable.dispose()
    }
  }
}

export class SplitStream<T> implements Stream<T> {
  sink0 = nullSink
  sink1 = nullSink
  disposable = nullDisposable
  _disposable: Disposable
  latest: T | null

  constructor (private source: Stream<T>) { }

  run (sink: Sink<T>, scheduler: Scheduler): Disposable {
    if (this.sink0 === nullSink) {
      this.sink0 = sink
      this.disposable = this.source.run(this, scheduler)
    } else if (this.sink1 === nullSink) {
      this.sink1 = sink
      if (this.latest) {
        this.sink1.event(scheduler.now(), this.latest)
        this.latest = null
      }
    } else {
      throw new TypeError('> 2 observers')
    }

    return new SplitDisposable(this, sink)
  }

  _dispose () {
    const disposable = this._disposable
    this._disposable = nullDisposable
    return disposable.dispose()
  }

  event (time: Time, value: T) {
    this.sink0.event(time, value)
    this.sink1.event(time, value)

    if (this.sink1 === nullSink) {
      this.latest = value
    }
  }

  end (time: Time) {
    this.sink0.end(time)
    this.sink1.end(time)
  }

  error (time: Time, err: Error) {
    this.sink0.error(time, err)
    this.sink1.error(time, err)
  }
}

export const splitStream = <T>(stream: Stream<T>) => {
  const sp = new SplitStream<T>(stream)
  return [sp, sp]
}
