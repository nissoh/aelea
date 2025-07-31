import type { Disposable, Sink } from './types.js'

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

export abstract class TransformSink<In, Out> implements Sink<In> {
  constructor(protected readonly sink: Sink<Out>) {}

  abstract event(value: In): void

  error(error: any) {
    this.sink.error(error)
  }

  end(): void {
    this.sink.end()
  }

  /**
   * Helper method to execute a function and handle errors.
   * If the function throws, the error is forwarded to the sink.
   */
  protected tryEvent(fn: () => void): void {
    try {
      fn()
    } catch (error) {
      this.sink.error(error)
    }
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
