import type { ISink, ITask } from '../types.js'

export function runTask(time: number, task: ITask): void {
  task.run(time)
}

export const propagateRunEventTask = <TSinkValue, TValue>(
  sink: ISink<TSinkValue>,
  run: (time: number, sink: ISink<TSinkValue>, value: TValue) => void,
  value: TValue
) => new PropagateRunEventTask(sink, run, value)

export const propagateRunTask = <T>(sink: ISink<T>, run: (time: number, sink: ISink<T>) => void) =>
  new PropagateRunTask(sink, run)

export const propagateEndTask = (sink: ISink<any>) => new PropagateEndTask(sink)

export const propagateErrorTask = (sink: ISink<unknown>, error: unknown) => new PropagateErrorTask(sink, error)

export abstract class PropagateTask<T> implements ITask, Disposable {
  active = true

  constructor(readonly sink: ISink<T>) {}

  abstract runIfActive(time: number): void

  [Symbol.dispose](): void {
    this.active = false
  }

  run(time: number): void {
    if (this.active) this.runIfActive(time)
  }

  error(time: number, e: Error): void {
    // TODO: Remove this check and just do this.sink.error( e)?
    if (!this.active) {
      fatalError(e)
    }
    this.sink.error(time, e)
  }
}

class PropagateRunEventTask<TSinkValue, TValue> extends PropagateTask<TSinkValue> {
  constructor(
    sink: ISink<TSinkValue>,
    readonly runEvent: (time: number, sink: ISink<TSinkValue>, value: TValue) => void,
    readonly value: TValue
  ) {
    super(sink)
  }

  runIfActive(time: number): void {
    if (this.active) this.runEvent(time, this.sink, this.value)
  }
}

class PropagateRunTask extends PropagateTask<any> {
  constructor(
    sink: ISink<any>,
    readonly runEvent: (time: number, sink: ISink<any>) => void
  ) {
    super(sink)
  }

  runIfActive(time: number): void {
    if (this.active) this.runEvent(time, this.sink)
  }
}

class PropagateEndTask extends PropagateTask<any> {
  runIfActive(time: number): void {
    if (this.active) this.sink.end(time)
  }
}

class PropagateErrorTask extends PropagateTask<any> {
  constructor(
    sink: ISink<unknown>,
    readonly errorValue: unknown
  ) {
    super(sink)
  }

  runIfActive(time: number): void {
    if (this.active) this.sink.error(time, this.errorValue)
  }
}

function fatalError(e: unknown): void {
  setTimeout(rethrow, 0, e)
}

function rethrow(e: unknown): never {
  throw e
}
