import type { Disposable } from './types.js'

/**
 * Create a Disposable that disposes the provided value using a dispose function
 */
export const disposeWith = <T>(dispose: (value: T) => void, value: T): Disposable => ({
  [Symbol.dispose]: () => dispose(value)
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

/**
 * Create a Disposable that disposes all provided disposables
 */
export const disposeAll = (disposables: Disposable[]): Disposable => ({
  [Symbol.dispose]: () => {
    for (const d of disposables) {
      d[Symbol.dispose]()
    }
  }
})

/**
 * A disposable that does nothing when disposed
 */
export const disposeNone: Disposable = {
  [Symbol.dispose]: () => {}
}

/**
 * Wrap an existing disposable (which may not already have been once()d)
 * so that it will only dispose its underlying resource at most once.
 */
export const disposeOnce = (disposable: Disposable): Disposable => new DisposeOnce(disposable)

class DisposeOnce implements Disposable {
  private disposed = false
  private disposable?: Disposable

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
