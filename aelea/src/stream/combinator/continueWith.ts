import { stream } from '../stream.js'
import type { ISink, IStream } from '../types.js'
import { disposeBoth } from '../utils/disposable.js'
import { curry2 } from '../utils/function.js'

/**
 * When stream ends, continue with values from another stream
 *
 * streamA:         -1-2-3-|
 * streamB:                 -4-5-6->
 * continueWith(f): -1-2-3-4-5-6->
 */
export const continueWith: IContinueWithCurry = curry2((f, s) =>
  stream((scheduler, sink) => {
    const dsink = new ContinueWithSink(scheduler, sink, f)

    return disposeBoth(s.run(scheduler, dsink), dsink)
  })
)

class ContinueWithSink<A, B> implements ISink<A> {
  private disposable: Disposable | null = null

  constructor(
    private env: any,
    private sink: ISink<A | B>,
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

export interface IContinueWithCurry {
  <A, B>(f: () => IStream<B>, s: IStream<A>): IStream<A | B>
  <A, B>(f: () => IStream<B>): (s: IStream<A>) => IStream<A | B>
}
