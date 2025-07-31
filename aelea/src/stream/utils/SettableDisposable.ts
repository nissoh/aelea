/**
 * A disposable that can have its underlying disposable set/changed.
 * Useful for cases where the disposable needs to be created after construction.
 */
export class SettableDisposable implements Disposable {
  private disposed = false
  private disposable?: Disposable

  setDisposable(disposable: Disposable): void {
    if (this.disposed) {
      disposable[Symbol.dispose]()
    } else {
      this.disposable = disposable
    }
  }

  [Symbol.dispose](): void {
    if (!this.disposed) {
      this.disposed = true
      this.disposable?.[Symbol.dispose]()
    }
  }
}
