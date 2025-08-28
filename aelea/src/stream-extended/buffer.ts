import { disposeBoth, disposeNone, type IScheduler, type ISink, type IStream } from '../stream/index.js'
import { propagateRunEventTask } from '../stream/scheduler/PropagateTask.js'
import { curry2 } from '../stream/utils/function.js'

interface IBufferEvents {
  period: number
  maxSize?: number
  prune?: boolean // When true, discards old events to keep only maxSize newest events per period
}

/**
 * Buffer events from a stream into arrays based on time period and/or max size
 *
 * Two core behaviors:
 * 1. **Time-based buffering**: Collects events during each period interval
 * 2. **Overflow handling**: if prune is false, buffer exceeds maxSize, excess events carry over to next period
 *
 * stream:              12345678-9------AB--C----D--->
 * bufferEvents({period: 10, maxSize: 4}):
 * output:              ---------a------b---c----d--e->
 *                               |      |   |    |  |
 *                               |      |   |    |  +-- e=[D] (t30)
 *                               |      |   |    +-- d=[C] (t20)
 *                               |      |   +-- c=[9,A,B] (t20)
 *                               |      +-- b=[5,6,7,8] (t10), kept [9]
 *                               +-- a=[1,2,3,4] (t10), kept [5,6,7,8,9]
 *
 * With prune=true: Discards old events to keep only maxSize newest per period
 * stream:              12345678-9------AB--C----D--->
 * output:              ---------a------b---c----d--e->
 *                               |      |   |    |  |
 *                               |      |   |    |  +-- e=[D] (t30)
 *                               |      |   |    +-- d=[C] (t20)
 *                               |      |   +-- c=[A,B] (t20)
 *                               |      +-- b=[9] (t10)
 *                               +-- a=[5,6,7,8] (t10), discarded [1,2,3,4]
 *
 * Load spreading: Ensures consistent batch sizes of ≤maxSize per period
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
    const bufferSink = new BufferEventsSink(
      sink,
      scheduler,
      this.options.period,
      this.options.maxSize,
      this.options.prune
    )
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
    readonly maxSize = 1000,
    readonly prune = false
  ) {}

  event(time: number, value: T): void {
    // Start periodic emissions on first event
    if (!this.emitting) {
      this.emitting = true
      this.scheduleEmission()
    }

    this.buffer.push(value)

    // Pruning mode: keep only the newest maxSize events
    if (this.prune && this.buffer.length > this.maxSize) {
      // Shift buffer to keep only the newest maxSize events
      const excess = this.buffer.length - this.maxSize
      for (let i = 0; i < this.maxSize; i++) {
        this.buffer[i] = this.buffer[i + excess]
      }
      this.buffer.length = this.maxSize
    }
  }

  error(time: number, err: unknown): void {
    this.sink.error(time, err)
  }

  end(time: number): void {
    this.sourceEnded = true

    // If buffer is empty, end immediately
    // The scheduled task will also check this condition
    if (this.buffer.length === 0) {
      this.emitting = false
      this.scheduledTask[Symbol.dispose]()
      this.scheduledTask = disposeNone
      this.sink.end(time)
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
function emitPeriodically<T>(time: number, sink: ISink<readonly T[]>, bufferSink: BufferEventsSink<T>): void {
  // Clear any existing scheduled task before proceeding
  bufferSink.scheduledTask = disposeNone

  // Only continue if we're still emitting
  if (!bufferSink.emitting) return

  // Emit buffer if not empty
  const len = bufferSink.buffer.length
  if (len > 0) {
    // Emit at most maxSize items per period
    const emitCount = Math.min(len, bufferSink.maxSize)
    const events = new Array(emitCount)
    for (let i = 0; i < emitCount; i++) {
      events[i] = bufferSink.buffer[i]
    }
    sink.event(time, events)

    // Keep remaining items for next period (unless pruning)
    if (bufferSink.prune) {
      // Pruning mode: clear buffer after each emission
      bufferSink.buffer.length = 0
    } else {
      // Default mode: keep excess events for next period
      const remaining = len - emitCount
      if (remaining > 0) {
        for (let i = 0; i < remaining; i++) {
          bufferSink.buffer[i] = bufferSink.buffer[i + emitCount]
        }
        bufferSink.buffer.length = remaining
      } else {
        bufferSink.buffer.length = 0
      }
    }
  }

  // Check if we should end the stream (after potentially emitting)
  if (bufferSink.sourceEnded && bufferSink.buffer.length === 0) {
    sink.end(time)
    return
  }

  // Continue periodic emissions
  bufferSink.scheduleEmission()
}
