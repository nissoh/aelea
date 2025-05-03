import { disposeNone } from '@most/disposable'
import type { Disposable } from '@most/types'
import type { ISettableDisposable } from '../types.js'

export class SettableDisposable implements ISettableDisposable {
  private disposable: Disposable | undefined
  private disposed = false

  constructor(private initialDiposable = disposeNone()) {}

  set(disposable: Disposable): void {
    if (this.disposable !== undefined) {
      throw new Error('set() called more than once')
    }

    this.disposable = disposable

    if (this.disposed) {
      disposable.dispose()
    }
  }

  dispose(): void {
    if (this.disposed) {
      return
    }

    this.disposed = true

    if (this.disposable !== undefined) {
      this.initialDiposable.dispose()
      this.disposable.dispose()
    }
  }
}
