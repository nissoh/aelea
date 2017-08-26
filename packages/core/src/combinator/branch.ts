import { Stream, Scheduler, Sink, Time, Disposable } from '@most/types'
import { NodeStreamLike, NodeStreamType } from '../types'

export type nodeInput = (input: nodeInput) => NodeStreamLike


export type nodeCurried<A extends NodeStreamType> = () => A

export class Branch implements Stream<NodeStreamType> {
  constructor (private ps: NodeStreamLike, private cs: NodeStreamLike) { }

  run (sink: Sink<NodeStreamType>, scheduler: Scheduler) {
    const branchSink = new BranchSink(this.cs, sink, scheduler)
    return this.ps.run(branchSink, scheduler)
  }
}

class BranchSink {
  constructor (private cs: NodeStreamLike,
               private sink: Sink<NodeStreamType>,
               private scheduler: Scheduler) { }

  event (t: Time, parent: NodeStreamType) {
    // tslint:disable-next-line:no-unused-expression
    new InnerChildSink(this.cs, this.scheduler, parent)

    this.sink.event(t, parent)
  }

  end (t: Time) {
    this.sink.end(t)
  }

  error (t: Time, e: Error) {
    this.sink.error(t, e)
  }
}

class InnerChildSink implements Sink<NodeStreamType> {
  disposable: Disposable

  childDisposable = this.cs.run(this, this.scheduler)

  constructor (private cs: NodeStreamLike, private scheduler: Scheduler, private parent: NodeStreamType) { }

  event (t: Time, child: NodeStreamType): void {
    this.parent.appendChild(child)
  }
  end (t: Time): void {
    this.childDisposable.dispose()
  }
  error (t: Time, err: Error): void {
    this.end(t)
  }
}
