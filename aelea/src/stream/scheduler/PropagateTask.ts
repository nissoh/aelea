import type { IScheduler, ISink, ITask } from '../types.js'

export function runTask(task: ITask): void {
  task.run()
}

export const propagateRunEventTask = <TSinkValue, TValue>(
  sink: ISink<TSinkValue>,
  scheduler: IScheduler,
  run: (sink: ISink<TSinkValue>, value: TValue) => void,
  value: TValue
) => new PropagateRunEventTask(sink, scheduler, run, value)

export const propagateRunTask = <T>(sink: ISink<T>, scheduler: IScheduler, run: (sink: ISink<T>) => void) =>
  new PropagateRunTask(sink, scheduler, run)

export const propagateEndTask = (sink: ISink<any>, scheduler: IScheduler) => new PropagateEndTask(sink, scheduler)

export const propagateErrorTask = (sink: ISink<unknown>, scheduler: IScheduler, error: unknown) =>
  new PropagateErrorTask(sink, scheduler, error)

export abstract class PropagateTask<T> implements ITask, Disposable {
  active = true

  constructor(
    readonly sink: ISink<T>,
    readonly scheduler: IScheduler
  ) {}

  abstract runIfActive(): void

  [Symbol.dispose](): void {
    this.active = false
    // this.scheduler.cancel(this)
  }

  run(): void {
    if (this.active) this.runIfActive()
  }

  error(e: Error): void {
    // TODO: Remove this check and just do this.sink.error( e)?
    if (!this.active) {
      fatalError(e)
    }
    this.sink.error(e)
  }
}

class PropagateRunEventTask<TSinkValue, TValue> extends PropagateTask<TSinkValue> {
  constructor(
    sink: ISink<TSinkValue>,
    scheduler: IScheduler,
    readonly runEvent: (sink: ISink<TSinkValue>, value: TValue) => void,
    readonly value: TValue
  ) {
    super(sink, scheduler)
  }

  runIfActive(): void {
    if (this.active) this.runEvent(this.sink, this.value)
  }
}

class PropagateRunTask extends PropagateTask<any> {
  constructor(
    sink: ISink<any>,
    scheduler: IScheduler,
    readonly runEvent: (sink: ISink<any>) => void
  ) {
    super(sink, scheduler)
  }

  runIfActive(): void {
    if (this.active) this.runEvent(this.sink)
  }
}

class PropagateEndTask extends PropagateTask<any> {
  runIfActive(): void {
    if (this.active) this.sink.end()
  }
}

class PropagateErrorTask extends PropagateTask<any> {
  constructor(
    sink: ISink<unknown>,
    scheduler: IScheduler,
    readonly errorValue: unknown
  ) {
    super(sink, scheduler)
  }

  runIfActive(): void {
    if (this.active) this.sink.error(this.errorValue)
  }
}

function fatalError(e: unknown): void {
  setTimeout(rethrow, 0, e)
}

function rethrow(e: unknown): never {
  throw e
}
