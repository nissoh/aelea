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
