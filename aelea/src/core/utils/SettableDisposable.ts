import { disposeNone } from '@most/disposable'
import type { Disposable } from '@most/types';

export class SettableDisposable implements Disposable {
  private disposable: Disposable | undefined;
  private disposed = false

  constructor(private initialDiposable = disposeNone()) {}

  setDisposable(disposable: Disposable): void {
    if (this.disposable !== undefined) {
      throw new Error('setDisposable called more than once')
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
