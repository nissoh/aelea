import type { IScheduler, ISink, IStream } from '../../stream/index.js'
import { MulticastSink } from './sink.js'

/**
 * Creates a "tethered" pair of streams from a single source.
 *
 * The pattern creates a split topology where each primary subscription
 * creates its own TetherSink that forwards events to both destinations:
 *
 * ```
 * Source ──┬── TetherSink₁ ──┬──> Primary Sink₁
 *          │                 └──┐
 *          │                    │
 *          ├── TetherSink₂ ──┬──> Primary Sink₂
 *          │                 └──┤
 *          │                    │
 *          └── TetherSink₃ ──┬──> Primary Sink₃
 *                            └──┤
 *                               ↓
 *                        Tether Multicast
 *                         /    |    \
 *                        v     v     v
 *                     tether tether tether
 *                     sub₁   sub₂   sub₃
 * ```
 *
 * Example flow for event 'x':
 * - Primary subscription 1: Source → TetherSink₁ → Primary Sink₁ + Tether
 * - Primary subscription 2: Source → TetherSink₂ → Primary Sink₂ + Tether
 * - Tether sees 'x' twice (once from each primary subscription)
 *
 * Key behaviors:
 * - Primary stream: Normal stream behavior (multiple subscribers allowed)
 * - Tether stream: Multicast that aggregates events from ALL primary subscriptions
 * - Each primary subscription creates its own TetherSink
 * - Tether receives events from every primary subscription (may see duplicates)
 *
 * @returns [primary, tethered] stream tuple
 */
export const tether = <T>(source: IStream<T>): [IStream<T>, IStream<T>] => {
  const tetherStream = new TetherStream<T>()
  return [new PrimaryStream(source, tetherStream), tetherStream]
}

class TetherSink<T> implements ISink<T> {
  constructor(
    private readonly primarySink: ISink<T>,
    private readonly tetherStream: TetherStream<T>
  ) {}

  event(x: T): void {
    this.primarySink.event(x)
    this.tetherStream.event(x)
  }

  end(): void {
    this.primarySink.end()
    this.tetherStream.end()
  }

  error(err: Error): void {
    this.primarySink.error(err)
    this.tetherStream.error(err)
  }
}

class PrimaryStream<T> implements IStream<T> {
  constructor(
    private readonly source: IStream<T>,
    private readonly tether: TetherStream<T>
  ) {}

  run(sink: ISink<T>, scheduler: IScheduler): Disposable {
    // Each subscription gets its own TetherSink
    const tetherSink = new TetherSink(sink, this.tether)
    return this.source.run(tetherSink, scheduler)
  }
}

/**
 * A multicast stream that receives events from the TetherSink
 * Supports multiple subscribers without needing a source stream
 */
class TetherStream<T> extends MulticastSink<T> implements IStream<T> {}
