import { disposeWith, type IScheduler, type ISink, type IStream, PipeSink } from '../stream/index.js'

export function flattenEvents<T>(source: IStream<T[]>): IStream<T> {
  return new FlattenEventsStream(source)
}

class FlattenEventsSink<T> extends PipeSink<T[], T> {
  event(items: T[]): void {
    for (let i = 0; i < items.length; i++) {
      this.sink.event(items[i])
    }
  }
}

class FlattenEventsStream<T> implements IStream<T> {
  constructor(private readonly source: IStream<T[]>) {}

  run(sink: ISink<T>, scheduler: IScheduler): Disposable {
    return this.source.run(new FlattenEventsSink(sink), scheduler)
  }
}

export function bufferEvents<T>(
  source: IStream<T>,
  period = 1000,
  maxSize = Number.POSITIVE_INFINITY
): IStream<readonly T[]> {
  if (period <= 0) {
    throw new Error('Buffer period must be positive')
  }
  if (maxSize <= 0) {
    throw new Error('Max buffer size must be positive')
  }

  return new BufferEventsStream(source, period, maxSize)
}

class BufferEventsSink<T> implements ISink<T> {
  buffer: T[] = []
  private nextEmitTime: number | null = null

  constructor(
    private readonly sink: ISink<readonly T[]>,
    private readonly scheduler: IScheduler,
    private readonly period: number,
    private readonly maxSize: number
  ) {}

  event(value: T): void {
    const time = this.scheduler.time()

    // Initialize timing on first event
    if (this.nextEmitTime === null) {
      this.nextEmitTime = time + this.period
    }

    this.buffer.push(value)

    // Emit if period elapsed or buffer full
    if (time >= this.nextEmitTime || this.buffer.length >= this.maxSize) {
      this.emitBuffer(time)
    }
  }

  error(err: unknown): void {
    this.sink.error(err)
  }

  end(): void {
    if (this.buffer.length > 0) {
      this.sink.event(this.buffer)
      this.buffer = []
    }
    this.sink.end()
  }

  private emitBuffer(time: number): void {
    if (this.buffer.length > 0) {
      this.sink.event(this.buffer)
      this.buffer = []
    }
    this.nextEmitTime = time + this.period
  }
}

class BufferEventsStream<T> implements IStream<readonly T[]> {
  constructor(
    private readonly source: IStream<T>,
    private readonly period: number,
    private readonly maxSize: number
  ) {}

  run(sink: ISink<readonly T[]>, scheduler: IScheduler): Disposable {
    const bufferSink = new BufferEventsSink(sink, scheduler, this.period, this.maxSize)
    const disposable = this.source.run(bufferSink, scheduler)

    return disposeWith(() => {
      bufferSink.buffer.length = 0 // Clear buffer on dispose
      disposable[Symbol.dispose]()
    })
  }
}
