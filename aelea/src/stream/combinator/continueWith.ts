import { disposeBoth } from '../disposable.js'
import { curry2 } from '../function.js'
import type { IStream, Sink } from '../types.js'

export interface IContinueWithCurry {
  <A, B>(f: () => IStream<B>, s: IStream<A>): IStream<A | B>
  <A, B>(f: () => IStream<B>): (s: IStream<A>) => IStream<A | B>
}

export const continueWith: IContinueWithCurry = curry2((f, s) => ({
  run(scheduler, sink) {
    const dsink = new ContinueWithSink(scheduler, sink, f)

    return disposeBoth(s.run(scheduler, dsink), dsink)
  }
}))

class ContinueWithSink<A, B> implements Sink<A> {
  private disposable: Disposable | null = null

  constructor(
    private env: any,
    private sink: Sink<A | B>,
    private f: () => IStream<B>
  ) {}

  event(value: A): void {
    this.sink.event(value)
  }

  error(error: any): void {
    this.sink.error(error)
  }

  end(): void {
    if (this.disposable) {
      this.disposable[Symbol.dispose]()
    }
    try {
      const nextStream = this.f()
      this.disposable = nextStream.run(this.env, this.sink)
    } catch (error) {
      this.sink.error(error)
    }
  }

  [Symbol.dispose](): void {
    if (this.disposable) {
      this.disposable[Symbol.dispose]()
    }
  }
}
