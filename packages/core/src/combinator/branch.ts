import { Scheduler, Sink, Time, Disposable } from '@most/types'
import { NodeStream, DomStream, DomType, NodeType } from '../types'
import { nullSink } from '../utils'

export { Disposable }

export type nodeInput = (input: nodeInput) => NodeStream


export class Branch implements NodeStream {
  constructor (private ps: NodeStream, private cs: DomStream) { }

  run (sink: Sink<NodeType>, scheduler: Scheduler) {
    const branchSink = new BranchSink(this.cs, sink, scheduler)
    return this.ps.run(branchSink, scheduler)
  }
}

class BranchSink {
  innerChild: Sink<any> = nullSink

  constructor (
    private cs: DomStream,
    private sink: Sink<NodeType>,
    private scheduler: Scheduler
  ) { }

  event (t: Time, parent: NodeType) {
    this.innerChild = new InnerChildSink(this.cs, this.scheduler, parent)
    this.sink.event(t, parent)
  }

  end (t: Time) {
    this.innerChild.end(t)
    this.sink.end(t)
  }

  error (t: Time, e: Error) {
    this.sink.error(t, e)
  }
}

class InnerChildSink implements Sink<DomType> {
  childrenList: DomType[] = []
  childDisposable = this.cs.run(this, this.scheduler)

  constructor (
    private cs: DomStream,
    private scheduler: Scheduler,
    private parent: Node
  ) {}

  event (t: Time, child: DomType): void {
    this.parent.appendChild(child)
  }
  end (t: Time): void {
    this.dispose()
  }
  error (t: Time, err: Error): void {
    this.end(t)
    throw (err)
  }

  dispose () {
    this.childDisposable.dispose()
  }
}


