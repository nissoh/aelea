import { stream } from '../stream.js'
import type { IScheduler, ISink, IStream } from '../types.js'
import { disposeNone, disposeWith } from '../utils/disposable.js'

export const tether = <T>(source: IStream<T>): [IStream<T>, IStream<T>] => {
  const tetherSource = new Tether(source)

  return [
    stream((sink, scheduler) => tetherSource.run(new SourceSink(tetherSource, sink), scheduler)),
    stream((sink, scheduler) => tetherSource.run(new TetherSink(sink), scheduler))
  ]
}

class SourceSink<T> implements ISink<T> {
  hasValue = false
  latestValue!: T

  constructor(
    private parent: Tether<T>,
    public sink: ISink<T>
  ) {}

  event(x: T): void {
    this.latestValue = x
    this.hasValue = true

    this.sink.event(x)
    for (const s of this.parent.tetherSinkList) {
      s.event(x)
    }
  }

  end() {
    this.sink.end()
  }

  error(e: Error): void {
    this.sink.error(e)
  }
}

class TetherSink<A> implements ISink<A> {
  constructor(public sink: ISink<A> | null) {}

  event(value: A): void {
    if (this.sink) {
      this.sink.event(value)
    }
  }

  end(): void {
    this.sink = null
  }

  error(err: Error): void {
    if (this.sink) {
      this.sink.error(err)
    } else {
      throw new Error(err.message)
    }
  }
}

class Tether<T> implements IStream<T> {
  sourceSinkList: SourceSink<T>[] = []
  tetherSinkList: TetherSink<T>[] = []

  sourceDisposable: Disposable = disposeNone

  constructor(private source: IStream<T>) {}

  run(sink: SourceSink<T> | TetherSink<T>, scheduler: IScheduler): Disposable {
    if (sink instanceof SourceSink) {
      this.sourceDisposable[Symbol.dispose]()
      this.sourceSinkList.push(sink)

      this.sourceDisposable = this.source.run(sink, scheduler)

      return {
        [Symbol.dispose]: () => {
          const srcIdx = this.sourceSinkList.indexOf(sink)
          this.sourceSinkList.splice(srcIdx, 1)
          this.sourceDisposable[Symbol.dispose]()
        }
      }
    }

    this.tetherSinkList.push(sink)

    for (const s of this.sourceSinkList) {
      if (s.hasValue) {
        sink.event(s.latestValue)
      }
    }

    return disposeWith(() => {
      sink.end()
      const sinkIdx = this.tetherSinkList.indexOf(sink)

      if (sinkIdx > -1) {
        // remove(sinkIdx, tetherSinkList)
        this.tetherSinkList.splice(sinkIdx, 1)
      }
    })
  }
}
