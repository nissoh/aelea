import type { ISink, Time } from '../types.js'

export abstract class PipeSink<I, O = I> implements ISink<I> {
  constructor(readonly sink: ISink<O>) {}

  abstract event(time: Time, value: I): void

  error(time: Time, e: any): void {
    this.sink.error(time, e)
  }

  end(time: Time): void {
    this.sink.end(time)
  }
}

export interface IndexedValue<A> {
  readonly index: number
  readonly value: A
  readonly ended: boolean
}

export class IndexSink<A> implements ISink<A> {
  ended = false
  value: A | undefined

  constructor(
    readonly sink: ISink<IndexedValue<A | undefined>>,
    public index: number
  ) {}

  event(time: Time, x: A): void {
    if (this.ended) this.sink.error(time, new Error('Cannot send events to ended sink'))

    this.value = x
    this.sink.event(time, this)
  }

  end(time: Time): void {
    if (this.ended) throw new Error('Cannot end an ended sink')

    this.ended = true
    this.sink.event(time, this)
  }

  error(time: Time, error: unknown): void {
    this.sink.error(time, error)
  }
}
