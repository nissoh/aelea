import { disposeNone, disposeWith } from '../disposable.js'
import type { IStream, Scheduler, Sink } from '../types.js'

export const tether = <T>(source: IStream<T>): [IStream<T>, IStream<T>] => {
  const tetherSource = new Tether(source)

  return [
    {
      run(scheduler, sink) {
        return tetherSource.run(scheduler, new SourceSink(tetherSource, sink))
      }
    },
    {
      run(scheduler, sink) {
        return tetherSource.run(scheduler, new TetherSink(sink))
      }
    }
  ]
}

class SourceSink<T> implements Sink<T> {
  hasValue = false
  latestValue!: T

  constructor(
    private parent: Tether<T>,
    public sink: Sink<T>
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

class TetherSink<A> implements Sink<A> {
  constructor(public sink: Sink<A> | null) {}

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

  run(scheduler: Scheduler, sink: SourceSink<T> | TetherSink<T>): Disposable {
    if (sink instanceof SourceSink) {
      this.sourceDisposable[Symbol.dispose]()
      this.sourceSinkList.push(sink)

      this.sourceDisposable = this.source.run(scheduler, sink)

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

    return disposeWith(
      ([tetherSinkList, sourceTetherSink]) => {
        sourceTetherSink.end()
        const sinkIdx = tetherSinkList.indexOf(sourceTetherSink)

        if (sinkIdx > -1) {
          // remove(sinkIdx, tetherSinkList)
          tetherSinkList.splice(sinkIdx, 1)
        }
      },
      [this.tetherSinkList, sink] as const
    )
  }
}
