import {Stream, Disposable, Sink, Scheduler} from '@most/types'
import {Op, NodeType} from './types'
import {nullSink} from './utils'
import {disposeAll} from '@most/disposable'
import {splitStream} from './combinator/split'


export class SplitBehavior<A, B> implements Stream<B> {
  attachments: Disposable[] = []
  queuedAttachments: Stream<B>[] = []

  running: boolean = false

  sink: Sink<B> = nullSink
  scheduler: Scheduler | undefined

  constructor(private behavior: Op<A, A>) {}

  run(sink: Sink<B>, scheduler: Scheduler): Disposable {
    this.running = true

    if (this.queuedAttachments.length) {
      const dss = this.queuedAttachments.map(x => x.run(sink, scheduler))
      this.attachments.push(...dss)
    } else {
      this.sink = sink
      this.scheduler = scheduler
    }

    return this
  }

  dispose() {
    disposeAll(this.attachments)

    this.attachments = []
  }

  sample(s: Stream<A>, behavior?: Op<A, B>): Stream<A> { 
    const [e1, e2] = splitStream(s)
      const inputStream = behavior ? behavior(this.behavior(e2)) : this.behavior(e2) as any

      if (this.running && this.scheduler) {
        this.attachments.push(inputStream.run(this.sink, this.scheduler))
      } else {
        this.queuedAttachments.push(inputStream)
      }

      return e1
  }
}

export const splitBehavior = <A, B extends NodeType>(cfn: Op<A, A>) => new SplitBehavior<A, B>(cfn)

