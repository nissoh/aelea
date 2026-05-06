import * as MC from '@most/core'
import * as MS from '@most/scheduler'
import { createDefaultScheduler, type ISink, type IStream } from '../../src/stream/index.js'

// @most/types isn't a direct dep — re-derive Stream<A> via ReturnType so we
// don't need a transitive type import.
type MostStream<A> = ReturnType<typeof MC.newStream<A>>

const aeleaScheduler = createDefaultScheduler()
const mostScheduler = MS.newDefaultScheduler()

export const fromArrayM = <A>(arr: readonly A[]): MostStream<A> =>
  MC.newStream<A>((sink, s) =>
    MS.asap(
      {
        run(t) {
          for (const a of arr) sink.event(t, a)
          sink.end(t)
        },
        error(t, e) {
          sink.error(t, e)
        },
        dispose() {}
      },
      s
    )
  )

class RunStreamSink implements ISink<any> {
  result: any
  resolve!: (value: any) => void
  reject!: (error: any) => void

  reset(resolve: (value: any) => void, reject: (error: any) => void) {
    this.result = undefined
    this.resolve = resolve
    this.reject = reject
  }

  event(_time: number, value: any): void {
    this.result = value
  }

  error(_time: number, error: any): void {
    this.reject(error)
  }

  end(_time: number): void {
    this.resolve(this.result)
  }
}

const reusableSink = new RunStreamSink()

export const runStream = <T>(stream: IStream<T>): Promise<T> =>
  new Promise<T>((resolve, reject) => {
    reusableSink.reset(resolve, reject)
    stream.run(reusableSink, aeleaScheduler)
  })

export const runMost = <T>(stream: any): Promise<T> => {
  let result: T
  const captured = MC.tap((x: T) => {
    result = x
  }, stream)
  return MC.runEffects(captured, mostScheduler).then(() => result!)
}
