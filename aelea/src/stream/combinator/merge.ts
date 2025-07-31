import { MergingSink } from '../sink.js'
import type { Disposable, IStream, Sink } from '../types.js'

// Type helper to extract union type from array of streams
type StreamsToUnion<T extends readonly IStream<any>[]> = T[number] extends IStream<infer U> ? U : never

// Overloads for better type inference
export function merge<A>(s1: IStream<A>): IStream<A>
export function merge<A, B>(s1: IStream<A>, s2: IStream<B>): IStream<A | B>
export function merge<A, B, C>(s1: IStream<A>, s2: IStream<B>, s3: IStream<C>): IStream<A | B | C>
export function merge<A, B, C, D>(
  s1: IStream<A>,
  s2: IStream<B>,
  s3: IStream<C>,
  s4: IStream<D>
): IStream<A | B | C | D>
export function merge<A, B, C, D, E>(
  s1: IStream<A>,
  s2: IStream<B>,
  s3: IStream<C>,
  s4: IStream<D>,
  s5: IStream<E>
): IStream<A | B | C | D | E>
export function merge<T extends IStream<any>[]>(...streams: T): IStream<StreamsToUnion<T>>

// Implementation
export function merge<T extends IStream<any>[]>(...streams: T): IStream<StreamsToUnion<T>> {
  return {
    run(scheduler, sink) {
      const state = { active: streams.length }
      // Pre-allocate array with known size to avoid growth
      const disposables = new Array<Disposable>(streams.length)

      // Use traditional for loop to avoid map/spread allocations
      for (let i = 0; i < streams.length; i++) {
        disposables[i] = streams[i].run(scheduler, new MergeSink(sink, state, disposables))
      }

      return {
        [Symbol.dispose]: () => {
          // Traditional for loop is faster than forEach
          for (let i = 0; i < disposables.length; i++) {
            disposables[i][Symbol.dispose]()
          }
        }
      }
    }
  }
}

class MergeSink<T> extends MergingSink<T> {
  constructor(
    public override readonly sink: Sink<T>,
    public override readonly state: { active: number },
    public override readonly disposables: readonly Disposable[]
  ) {
    super(sink, state, disposables)
  }

  event(value: T) {
    this.sink.event(value)
  }
}
