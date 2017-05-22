
import { Stream, Disposable, Scheduler, Sink, Time } from '@most/types'
import { curry2, CurriedFunction2 } from '@most/prelude'
import { splitStream, SplitStream } from './split'
import { NodeStreamLike } from './index'
import { inputComposition } from './utils'

// export type attachBehaviour = <T>(b: streamComposition<T>) => Behaviour<T>

export class Behaviour<T> implements Stream<T> {
  sampler: Stream<T> | void
  listeners = 0
  disposable: Disposable

  run (sink: Sink<T>, scheduler: Scheduler): Disposable {
    if (!this.sampler) throw Error('No sampler defined')

    if (++this.listeners === 1) {
      this.disposable = this.sampler.run(sink, scheduler)
    }

    return { dispose: () => this.dispose() }
  }

  dispose () {
    if (--this.listeners === 0) {
      this.disposable.dispose()
    }
  }

  sample (behaviour: inputComposition<any, T>, snode: NodeStreamLike) {
    const [e1, e2] = splitStream(snode)

    this.sampler = behaviour(e2)

    return e1
  }
}

export const future = <T>() => new Behaviour<T>()

const behaviorProxyHandler = {
  get (target: any, name: string): any {
    if (!(name in target)) {
      target[name] = future
    }
    return target[name]
  }
}
