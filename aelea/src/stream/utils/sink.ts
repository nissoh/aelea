import type { ISink } from '../types.js'

export abstract class PipeSink<I, O = I> implements ISink<I> {
  constructor(readonly sink: ISink<O>) {}

  abstract event(time: number, value: I): void

  error(time: number, e: any): void {
    this.sink.error(time, e)
  }

  end(time: number): void {
    this.sink.end(time)
  }
}

export interface IndexedValue<A> {
  readonly index: number
  readonly value: A
  readonly active: boolean
}

export class IndexSink<A> implements ISink<A> {
  public active = true
  public value: A | undefined

  constructor(
    readonly sink: ISink<IndexedValue<A | undefined>>,
    public index: number
  ) {}

  event(time: number, x: A): void {
    if (this.active) {
      this.value = x
      this.sink.event(time, this)
    }
  }

  end(time: number): void {
    if (!this.active) {
      return
    }
    this.active = false
    this.sink.event(time, this)
  }

  error(time: number, error: unknown): void {
    this.sink.error(time, error)
  }
}
