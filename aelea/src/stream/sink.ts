import type { Sink } from './types.js'

export abstract class PipeSink<T> implements Sink<T> {
  constructor(protected readonly sink: Sink<T>) {}

  abstract event(value: T): void

  error(e: any): void {
    this.sink.error(e)
  }

  end(): void {
    this.sink.end()
  }
}

export abstract class TransformSink<I, O> implements Sink<I> {
  constructor(protected readonly sink: Sink<O>) {}

  abstract event(value: I): void

  error(error: any) {
    this.sink.error(error)
  }

  end(): void {
    this.sink.end()
  }
}

export abstract class MergingSink<T> implements Sink<T> {
  constructor(
    protected readonly sink: Sink<T>,
    public readonly state: { active: number },
    public readonly disposables: readonly Disposable[]
  ) {}

  abstract event(value: T): void

  error(error: any) {
    if (--this.state.active === 0) {
      this.disposeAll()
      this.sink.error(error)
    }
  }

  end() {
    if (--this.state.active === 0) {
      this.disposeAll()
      this.sink.end()
    }
  }

  private disposeAll() {
    const disposables = this.disposables
    for (let i = 0; i < disposables.length; i++) {
      disposables[i][Symbol.dispose]()
    }
  }
}

export function tryEvent<In, Out>(sink: Sink<Out>, f: (value: In) => Out, value: In): void {
  try {
    const transformed = f(value)
    sink.event(transformed)
  } catch (error) {
    sink.error(error)
  }
}

export interface IndexedValue<A> {
  readonly index: number
  readonly value: A
  readonly active: boolean
}

export class IndexSink<A> implements Sink<A> {
  readonly index: number
  active: boolean
  value: A | undefined

  constructor(
    protected readonly sink: Sink<IndexedValue<A | undefined>>,
    i: number
  ) {
    this.index = i
    this.active = true
    this.value = undefined
  }

  event(x: A): void {
    if (!this.active) {
      return
    }
    this.value = x
    this.sink.event(this)
  }

  end(): void {
    if (!this.active) {
      return
    }
    this.active = false
    this.sink.event(this)
  }

  error(error: any): void {
    this.sink.error(error)
  }
}
