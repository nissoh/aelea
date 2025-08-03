import type { ISink } from '../types.js'

export abstract class PipeSink<I, O = I> implements ISink<I> {
  constructor(readonly sink: ISink<O>) {}

  abstract event(value: I): void

  error(e: any): void {
    this.sink.error(e)
  }

  end(): void {
    this.sink.end()
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

  event(x: A): void {
    if (this.active) {
      this.value = x
      this.sink.event(this)
    }
  }

  end(): void {
    if (!this.active) {
      return
    }
    this.active = false
    this.sink.event(this)
  }

  error(error: unknown): void {
    this.sink.error(error)
  }
}
