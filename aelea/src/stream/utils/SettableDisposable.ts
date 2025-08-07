/**
 * A disposable that can have its underlying disposable set/changed.
 * Useful for cases where the disposable needs to be created after construction.
 */
export class SettableDisposable implements Disposable {
  disposable: Disposable | null = null
  disposed = false

  set(disposable: Disposable): void {
    if (this.disposable !== null) {
      throw new Error('Disposable already set')
    }

    this.disposable = disposable

    if (this.disposed) {
      disposable[Symbol.dispose]()
    }
  }

  [Symbol.dispose](): void {
    if (this.disposed) return

    this.disposed = true

    if (this.disposable !== null) {
      this.disposable[Symbol.dispose]()
      this.disposable = null
    }
  }
}
