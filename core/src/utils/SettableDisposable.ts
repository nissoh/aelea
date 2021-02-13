import { Disposable } from '@most/types'

export default class SettableDisposable implements Disposable {
  private disposable: Disposable | undefined;
  private disposed = false

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
      this.disposable.dispose()
    }
  }
}
