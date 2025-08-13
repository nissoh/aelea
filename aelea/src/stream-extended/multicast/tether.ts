import { disposeWith, type IScheduler, type ISink, type IStream } from '../../stream/index.js'
import { MulticastSink } from './sink.js'

/**
 * Creates a "tethered" pair of streams from a single source.
 *
 * The pattern creates a split topology:
 * ```
 *                source
 *                  |
 *                  v
 *            [TetherSink]
 *               /     \
 *              /       \
 *             v         v
 *      Primary Sink    Tether Multicast
 *      (unicast)       (multicast)
 *          |            /    |    \
 *          v           v     v     v
 *        sink      sink1  sink2  sink3
 * ```
 *
 * Key behaviors:
 * - Primary stream: Unicast (only one subscriber allowed)
 * - Tether stream: Multicast (multiple subscribers supported)
 * - Source lifecycle controlled by primary stream
 * - All events flow to both primary and tether subscribers
 *
 * @returns [primary, tethered] stream tuple
 */
export const tether = <T>(source: IStream<T>): [IStream<T>, IStream<T>] => {
  const tetherSource = new TetherStream<T>()
  return [new PrimaryStream(source, tetherSource), tetherSource]
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
  private disposable: Disposable | null = null

  constructor(
    private readonly source: IStream<T>,
    private readonly tether: TetherStream<T>
  ) {}

  run(sink: ISink<T>, scheduler: IScheduler): Disposable {
    if (this.disposable) {
      throw new Error('Primary stream already has a subscriber (unicast restriction)')
    }

    const tetherSink = new TetherSink(sink, this.tether)
    const sourceDisposable = this.source.run(tetherSink, scheduler)

    this.disposable = disposeWith(() => {
      this.disposable = null
      sourceDisposable[Symbol.dispose]()
    })

    return this.disposable
  }
}

/**
 * A multicast stream that receives events from the TetherSink
 * Supports multiple subscribers without needing a source stream
 */
class TetherStream<T> extends MulticastSink<T> implements IStream<T> {}
