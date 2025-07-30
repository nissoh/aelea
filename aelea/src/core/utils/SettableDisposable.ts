import type { Disposable } from '../../stream/index.js'
import { disposeNone } from '../../stream/index.js'

export interface ISettableDisposable extends Disposable {
  set: (disposable: Disposable) => void
}

export class SettableDisposable implements ISettableDisposable {
  private disposable: Disposable | undefined
  private disposed = false

  constructor(private initialDiposable = disposeNone) {}

  set(disposable: Disposable): void {
    if (this.disposable !== undefined) {
      throw new Error('set() called more than once')
    }

    this.disposable = disposable

    if (this.disposed) {
      disposable[Symbol.dispose]()
    }
  }

  [Symbol.dispose](): void {
    if (this.disposed) {
      return
    }

    this.disposed = true

    if (this.disposable !== undefined) {
      this.initialDiposable[Symbol.dispose]()
      this.disposable[Symbol.dispose]()
    }
  }
}
