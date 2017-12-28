
import { Stream, Disposable, Scheduler, Sink } from '@most/types'
import { inputComposition, NodeStream, Actions, Behaviors } from '../types'
import { splitStream, SplitStream } from '../combinator/split'
import { chain, multicast } from '@most/core'
import { compose } from '@most/prelude'


// const dragStart: (x: Node) => Stream<Event>
export class Behavior<T, R> implements Stream<T> {
  sampler: Stream<T> | void
  listeners = 0
  disposable: Disposable

  constructor (private input: inputComposition<R, T>) { }

  run (sink: Sink<T>, scheduler: Scheduler): Disposable {
    if (!this.sampler) throw Error('No sampler defined')
    this.disposable = this.sampler.run(sink, scheduler)

    return { dispose: () => this.dispose() }
  }

  dispose () {
    if (--this.listeners === 0) {
      this.disposable.dispose()
    }
  }

  sample (snode: NodeStream): SplitStream<Node> {
    const [e1, e2] = splitStream(snode)

    this.sampler = this.input(e2 as any)
    return e1
  }
}

export const behavior = <T, R>(x: inputComposition<R, T>) => new Behavior<T, R>(x)

export class Component<K extends string, T> implements Stream<any> {
  constructor (private model: Actions<K, T>, private view: (x: Behaviors<K, T>) => any) { }

  run (sink: Sink<any>, scheduler: Scheduler): Disposable {
    const mmdeo = Object.keys(this.model).reduce((seed, k) => {
      const item = chain(this.model[k as any])
      // const b = behavior(item)
      const b = behavior(compose(multicast, item))
      return { [k]: b, ...seed }
    }, {})

    const op = this.view(mmdeo as Behaviors<K, T>)
    return op.run(sink, scheduler)
  }
}


