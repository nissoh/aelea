import type { ISink, ITime } from '../types.js'

/**
 * Create a Disposable that disposes the provided value using a dispose function
 */
export const disposeWith = <TArgs extends readonly unknown[]>(
  dispose: (...args: TArgs) => void,
  ...args: TArgs
): Disposable => ({
  [Symbol.dispose]: () => dispose(...args)
})

/**
 * Create a Disposable that disposes both provided disposables.
 * If the first throws, the second is still disposed; the first error is rethrown.
 */
export const disposeBoth = (d1: Disposable, d2: Disposable): Disposable => ({
  [Symbol.dispose]: () => {
    let caught: unknown
    let threw = false
    try {
      d1[Symbol.dispose]()
    } catch (e) {
      caught = e
      threw = true
    }
    d2[Symbol.dispose]()
    if (threw) throw caught
  }
})

export function isDisposable(value: any): value is Disposable {
  return value && typeof value[Symbol.dispose] === 'function'
}

export function toDisposable(value: any): Disposable {
  if (!value) {
    return disposeNone
  }

  if (isDisposable(value)) {
    return value
  }

  if (typeof value === 'object' && typeof value.dispose === 'function') {
    return disposeWith(() => value.dispose())
  }

  if (typeof value === 'function') {
    return disposeWith(value)
  }

  return disposeNone
}

export const disposeAll = (disposables: Iterable<Disposable>): Disposable =>
  disposeWith(() => {
    let firstError: unknown
    let threw = false
    for (const d of disposables) {
      try {
        d[Symbol.dispose]()
      } catch (e) {
        if (!threw) {
          firstError = e
          threw = true
        }
      }
    }
    if (threw) throw firstError
  })

export const disposeNone: Disposable = {
  [Symbol.dispose]: () => {}
}

export const disposeOnce = (disposable: Disposable): Disposable => new DisposeOnce(disposable)

class DisposeOnce implements Disposable {
  disposed = false
  disposable?: Disposable

  constructor(disposable: Disposable) {
    this.disposable = disposable
  }

  [Symbol.dispose](): void {
    if (!this.disposed) {
      this.disposed = true
      if (this.disposable) {
        this.disposable[Symbol.dispose]()
        this.disposable = undefined
      }
    }
  }
}

// Try to dispose the disposable.  If it throws, send
// the error to sink.error with the provided Time value
export const tryDispose = (time: ITime, disposable: Disposable, sink: ISink<unknown>): void => {
  try {
    disposable[Symbol.dispose]()
  } catch (e) {
    sink.error(time, e)
  }
}
