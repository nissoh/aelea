import type { ITask } from '../types.js'

export class DelayDisposable implements Disposable {
  constructor(
    readonly handle: ReturnType<typeof setTimeout>,
    readonly task: ITask
  ) {}

  [Symbol.dispose](): void {
    clearTimeout(this.handle)
    this.task[Symbol.dispose]()
  }
}
