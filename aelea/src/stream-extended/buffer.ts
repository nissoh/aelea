import { disposeBoth, disposeNone, type IScheduler, type ISink, type IStream } from '../stream/index.js'
import { propagateRunEventTask } from '../stream/scheduler/PropagateTask.js'
import { curry2 } from '../stream/utils/function.js'

interface IBufferEvents {
  period: number
  maxSize?: number
}

/**
 * Buffer events from a stream into arrays based on time period and/or max size
 *
 * Time:      0ms      50ms     100ms    150ms    200ms    250ms    300ms
 *            |        |        |        |        |        |        |
 * stream:    -1-2-3-4-5-6-7-8-9---------10-11----12-------13------>
 *            |        |        |        |        |        |        |
 * bufferEvents({period: 100, maxSize: 4}):
 *            |        |        |        |        |        |        |
 * output:    ---------[1,2,3,4][5,6,7,8]---------[9,10,11][12]----[13]->
 *                     |        |                 |        |       |
 *                     |        |                 |        |       +-- period end
 *                     |        |                 |        +-- period (300ms)
 *                     |        |                 +-- period (200ms)
 *                     |        +-- overflow: emit 4, keep excess
 *                     +-- overflow: emit 4, keep excess
 *
 * Load spreading: Instead of bursts of 8-9 events, outputs consistent batches of ≤4
 */
export const bufferEvents: IBufferEventsCurry = curry2((options: IBufferEvents, source) => {
  const period = options.period
  const maxSize = options.maxSize ?? 1000

  if (period <= 0) throw new Error('Buffer period must be positive')
  if (maxSize <= 0) throw new Error('Max buffer size must be positive')

  return new BufferEventsStream(source, options)
})

export interface IBufferEventsCurry {
  <T>(options: IBufferEvents, source: IStream<T>): IStream<readonly T[]>
  <T>(options: IBufferEvents): (source: IStream<T>) => IStream<readonly T[]>
}

class BufferEventsStream<T> implements IStream<readonly T[]> {
  constructor(
    readonly source: IStream<T>,
    readonly options: IBufferEvents
  ) {}

  run(sink: ISink<readonly T[]>, scheduler: IScheduler): Disposable {
    const bufferSink = new BufferEventsSink(sink, scheduler, this.options.period, this.options.maxSize)
    const sourceDisposable = this.source.run(bufferSink, scheduler)

    return disposeBoth(bufferSink, sourceDisposable)
  }
}

class BufferEventsSink<T> implements ISink<T>, Disposable {
  buffer: T[] = []
  scheduledTask: Disposable = disposeNone
  public emitting = false
  sourceEnded = false

  constructor(
    readonly sink: ISink<readonly T[]>,
    readonly scheduler: IScheduler,
    readonly period: number,
    readonly maxSize = 1000
  ) {}

  event(value: T): void {
    // Start periodic emissions on first event
    if (!this.emitting) {
      this.emitting = true
      this.scheduleEmission()
    }

    this.buffer.push(value)

    // Handle overflow - emit maxSize items and keep excess for next period
    if (this.buffer.length > this.maxSize) {
      // Create array with exactly maxSize items
      const toEmit = new Array(this.maxSize)
      for (let i = 0; i < this.maxSize; i++) {
        toEmit[i] = this.buffer[i]
      }

      // Shift remaining items to the beginning
      const remaining = this.buffer.length - this.maxSize
      for (let i = 0; i < remaining; i++) {
        this.buffer[i] = this.buffer[i + this.maxSize]
      }
      this.buffer.length = remaining

      this.sink.event(toEmit)
    }
  }

  error(err: unknown): void {
    this.sink.error(err)
  }

  end(): void {
    this.sourceEnded = true

    // If buffer is empty, end immediately
    // The scheduled task will also check this condition
    if (this.buffer.length === 0) {
      this.emitting = false
      this.scheduledTask[Symbol.dispose]()
      this.scheduledTask = disposeNone
      this.sink.end()
    }
    // Otherwise let the scheduled task handle ending when buffer empties
  }

  scheduleEmission(): void {
    this.scheduledTask = this.scheduler.delay(propagateRunEventTask(this.sink, emitPeriodically, this), this.period)
  }

  [Symbol.dispose](): void {
    this.emitting = false
    this.scheduledTask[Symbol.dispose]()
  }
}

// Static function to avoid closure creation
function emitPeriodically<T>(sink: ISink<readonly T[]>, bufferSink: BufferEventsSink<T>): void {
  // Clear any existing scheduled task before proceeding
  bufferSink.scheduledTask = disposeNone

  // Only continue if we're still emitting
  if (!bufferSink.emitting) return

  // Emit buffer if not empty
  const len = bufferSink.buffer.length
  if (len > 0) {
    // Always create a copy to maintain immutability
    const events = new Array(len)
    for (let i = 0; i < len; i++) {
      events[i] = bufferSink.buffer[i]
    }
    sink.event(events)
    bufferSink.buffer.length = 0
  }

  // Check if we should end the stream (after potentially emitting)
  if (bufferSink.sourceEnded && bufferSink.buffer.length === 0) {
    sink.end()
    return
  }

  // Continue periodic emissions
  bufferSink.scheduleEmission()
}
