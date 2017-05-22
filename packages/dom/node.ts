import { style, StyleLike, IStyleProperties } from './style'
import { Scheduler, Sink, Stream, Disposable, Task, Time } from '@most/types'
import { compose, id, curry2, CurriedFunction2 } from '@most/prelude'
import { newDefaultScheduler } from '@most/scheduler'
import { disposeBoth } from '@most/disposable'
import { future, Behaviour } from './behaviour'
import { requestFrameTask } from './'

export type nodeInput = (input: nodeInput) => NodeStreamLike

export interface NodeStreamLike extends Stream<NodeStreamType | never> {}
export type NodeStreamType = Node
export type nodeCurried<A extends NodeStreamType> = () => A

export class Branch implements Stream<NodeStreamType> {
  constructor (private cs: NodeStreamLike,
               private ps: NodeStreamLike) { }

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
    const appendChildSink = new InnerChildSink(parent)
    const innerRun = this.cs.run(appendChildSink, this.scheduler)

    appendChildSink.disposable = innerRun

    this.sink.event(t, parent)
  }

  end (t: Time) {
    console.log('dd')
    this.sink.end(t)
  }

  error (t: Time, e: Error) {
    this.sink.error(t, e)
  }

}

class InnerChildSink implements Sink<NodeStreamType> {
  disposable: Disposable

  constructor (private parent: NodeStreamType) { }

  event (t: Time, child: NodeStreamType): void {
    this.parent.appendChild(child)
  }
  end (t: Time): void {
    this.disposable.dispose()
  }
  error (t: Time, err: Error): void {
    this.end(t)
  }
}

export class DisposeNode<A extends Node> {
  constructor (private child: A) {}
  dispose () {
    if (this.child.parentElement && this.child.parentElement.contains(this.child)) {
      this.child.parentElement.removeChild(this.child)
    }
  }
}

const runAttach = (parent)

export class NodeSource implements NodeStreamLike {
  constructor (private tagName: string) { }

  run (sink: Sink<NodeStreamType>, scheduler: Scheduler) {
    const node = document.createElement(this.tagName || 'node')
    const disp = requestFrameTask(sink, scheduler, node).run()

    return disposeBoth(disp, new DisposeNode(node))
  }
}

export class TextNodeSource implements Stream<Text> {
  constructor (private text: string) { }

  run (sink: Sink<Text>, scheduler: Scheduler) {
    const node = document.createTextNode(this.text)
    const disp = requestFrameTask(sink, scheduler, node).run()

    return disposeBoth(disp, new DisposeNode(node))
  }
}

export class DomEvent<T extends Event> implements Stream<T> {
  constructor (private name: string, private node: EventTarget, private capture: boolean) {}

  run (sink: Sink<T>, scheduler: Scheduler) {
    const cb = (ev: T) => sink.event(scheduler.now(), ev)
    const dispose = () => this.node.removeEventListener(this.name, cb, this.capture)

    this.node.addEventListener(this.name, cb, this.capture)

    return { dispose }
  }
}

export const element = (name: string) => new NodeSource(name)
export const node = element('node')
export const text = (text: string) => new TextNodeSource(text)
export const branch = (ps: NodeStreamLike, cs: Stream<NodeStreamType>) => new Branch(cs, ps)

export const renderTo = (el: NodeStreamType, stream: NodeStreamLike) => {
  const renderSink = {
    event: (t, x) => el.appendChild(x),
    end (t) { },
    error (t, e) { }
  } as Sink<NodeStreamType>

  return stream.run(renderSink, newDefaultScheduler())
}

export const domEvent = <T extends Event>(name: string, node: Node, capture = false) => new DomEvent<T>(name, node, capture)

const behaviorProxyHandler = {
  get (target: any, name: string): any {
    if (!(name in target)) {
      target[name] = future()
    }
    return target[name]
  }
}

export class Component<A, B> implements Stream<B> {
  constructor (private fn: proxyObject<A, B>) {}

  run (sink: Sink<B>, scheduler: Scheduler): Disposable {
    const op = this.fn(new Proxy({}, behaviorProxyHandler))
    return op.run(sink, scheduler)
  }
}

export type BObjs = {
  [key: string]: Behaviour<any>
}

export type proxyObject<A, B> = (behaviours: BObjs) => Stream<B>

export const component = <A, B>(fn: proxyObject<A, B>) => new Component(fn)
