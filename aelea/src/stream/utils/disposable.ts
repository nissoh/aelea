import type { ISink, Time } from '../types.js'

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
 * Create a Disposable that disposes both provided disposables
 */
export const disposeBoth = (d1: Disposable, d2: Disposable): Disposable => ({
  [Symbol.dispose]: () => {
    d1[Symbol.dispose]()
    d2[Symbol.dispose]()
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
    for (const d of disposables) d[Symbol.dispose]()
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
export const tryDispose = (time: Time, disposable: Disposable, sink: ISink<unknown>): void => {
  try {
    disposable[Symbol.dispose]()
  } catch (e) {
    sink.error(time, e)
  }
}
