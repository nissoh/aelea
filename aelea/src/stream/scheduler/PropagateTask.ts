import type { ISink, ITask, Time } from '../types.js'

export function runTask(time: Time, task: ITask): void {
  task.run(time)
}

export const propagateRunEventTask = <TSinkValue, TValue>(
  sink: ISink<TSinkValue>,
  run: (time: Time, sink: ISink<TSinkValue>, value: TValue) => void,
  value: TValue
) => new PropagateRunEventTask(sink, run, value)

export const propagateRunTask = <T>(sink: ISink<T>, run: (time: Time, sink: ISink<T>) => void) =>
  new PropagateRunTask(sink, run)

export const propagateEndTask = (sink: ISink<any>) => new PropagateEndTask(sink)

export const propagateErrorTask = (sink: ISink<unknown>, error: unknown) => new PropagateErrorTask(sink, error)

export abstract class PropagateTask<T> implements ITask, Disposable {
  active = true

  constructor(readonly sink: ISink<T>) {}

  abstract runIfActive(time: Time): void

  [Symbol.dispose](): void {
    this.active = false
  }

  run(time: Time): void {
    if (this.active) this.runIfActive(time)
  }

  error(time: Time, e: Error): void {
    this.sink.error(time, e)
  }
}

class PropagateRunEventTask<TSinkValue, TValue> extends PropagateTask<TSinkValue> {
  constructor(
    sink: ISink<TSinkValue>,
    readonly runEvent: (time: Time, sink: ISink<TSinkValue>, value: TValue) => void,
    readonly value: TValue
  ) {
    super(sink)
  }

  runIfActive(time: Time): void {
    this.runEvent(time, this.sink, this.value)
  }
}

class PropagateRunTask extends PropagateTask<any> {
  constructor(
    sink: ISink<any>,
    readonly runEvent: (time: Time, sink: ISink<any>) => void
  ) {
    super(sink)
  }

  runIfActive(time: Time): void {
    this.runEvent(time, this.sink)
  }
}

class PropagateEndTask extends PropagateTask<any> {
  runIfActive(time: Time): void {
    this.sink.end(time)
  }
}

class PropagateErrorTask extends PropagateTask<any> {
  constructor(
    sink: ISink<unknown>,
    readonly errorValue: unknown
  ) {
    super(sink)
  }

  runIfActive(time: Time): void {
    this.sink.error(time, this.errorValue)
  }
}

function fatalError(e: unknown): void {
  setTimeout(rethrow, 0, e)
}

function rethrow(e: unknown): never {
  throw e
}
