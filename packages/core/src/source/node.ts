import { Scheduler, Sink, Stream } from '@most/types'
import { NodeStreamLike, NodeStreamType } from '../types'


export class DisposeNode<A extends Node> {
  constructor (private child: A) {}
  dispose () {
    if (this.child.parentElement && this.child.parentElement.contains(this.child)) {
      this.child.parentElement.removeChild(this.child)
    }
  }
}

export class NodeSource implements NodeStreamLike {
  constructor (private tagName: string) { }

  run (sink: Sink<NodeStreamType>, scheduler: Scheduler) {
    const node = document.createElement(this.tagName || 'node')
    // const disposable = requestFrameTask(sink, scheduler, node).run()
    sink.event(scheduler.now(), node)

    return new DisposeNode(node)
  }
}

export class TextNodeSource implements Stream<Text> {
  constructor (private text: string) { }

  run (sink: Sink<Text>, scheduler: Scheduler) {
    const node = document.createTextNode(this.text)
    // const disposable = requestFrameTask(sink, scheduler, node).run()

    sink.event(scheduler.now(), node)

    return new DisposeNode(node)
    // return disposeBoth(disposable, new DisposeNode(node))
  }
}


