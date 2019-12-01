
import {Stream, Disposable, Scheduler, Sink} from '@most/types'
import {FuncComp, ComponentActions, ComponentBehaviors, NodeType, Func} from '../types'
import {splitStream} from '../combinator/split'
import {chain, multicast} from '@most/core'
import {disposeAll} from '@most/disposable'
import {compose} from '@most/prelude'
import {nullSink} from './../'


export class Behavior<T, R> {
  attachments: Disposable[] = []
  queuedAttachments: Stream<T>[] = []

  sampler: Stream<T> | undefined
  running: boolean = false

  sink: Sink<T> = nullSink
  scheduler: Scheduler | undefined

  constructor(private input: FuncComp<R, T>) {}

  run(sink: Sink<T>, scheduler: Scheduler): Disposable {
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


  attach(s: Stream<R>): Stream<R> {

    const [e1, e2] = splitStream(s)

    const inputStream = this.input(e2)

    if (this.running && this.scheduler) {
      this.attachments.push(inputStream.run(this.sink, this.scheduler))
    } else {
      this.queuedAttachments.push(inputStream)
    }

    return e1
  }
}

export const behavior = <T, R>(x: FuncComp<R, T>) =>
  new Behavior<T, R>(x)

export class Component<T, K extends keyof T> implements Stream<NodeType> {
  constructor(private model: ComponentActions<T, K>, private view: (x: ComponentBehaviors<T, K>) => Stream<NodeType>) {}

  run(sink: Sink<NodeType>, scheduler: Scheduler): Disposable {

    const props: Array<K> = Object.keys(this.model) as any
    const mmdeo = props.reduce((seed, k) => {

      const item = chain(this.model[k])
      const b = behavior(compose(multicast, item))

      return {...seed, [k]: b}
    }, <ComponentBehaviors<T, K>>{})

    const op = this.view(mmdeo)
    return op.run(sink, scheduler)
  }
}


export const component = <T, K extends keyof T>(
  model: ComponentActions<T, K>,
  view: Func<ComponentBehaviors<T, K>, Stream<NodeType>>
) => new Component<T, K>(model, view)
