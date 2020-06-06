import { Stream, Disposable, Sink, Scheduler, Time } from '@most/types'
import { Op } from './types'
import { disposeNone } from '@most/disposable'
import { never, startWith } from '@most/core'
import { remove, findIndex, append } from '@most/prelude'
import { O } from './utils'

export class ProxyStream<A> implements Stream<A> {
  attachments: Disposable[] = []
  queuedAttachments: Stream<A>[] = []

  running: boolean = false

  sinks: Sink<A>[] = []
  scheduler: Scheduler | undefined

  run(sink: Sink<A>, scheduler: Scheduler): Disposable {
    this.running = true
    this.scheduler = scheduler

    this.add(sink)

    if (this.queuedAttachments.length) {
      const dss = this.queuedAttachments.map(x =>
        this.runProxy(x, scheduler)
      )
      this.attachments.push(...dss)
    }

    return {
      dispose: () => {
        this.remove(sink)
      }
    }
  }


  add(sink: Sink<A>): number {
    this.sinks = append(sink, this.sinks)
    return this.sinks.length
  }

  remove(sink: Sink<A>): number {
    const i = findIndex(sink, this.sinks)

    if (i >= 0) {
      this.sinks = remove(i, this.sinks)
    }

    return this.sinks.length
  }

  runProxy(x: Stream<A>, scheduler: Scheduler) {
    return x.run({
      event: (t, a) => {
        this.event(t, a)
      },
      end() { },
      error() { }
    }, scheduler)
  }

  attach(s: Stream<A>): Disposable {
    if (this.running && this.scheduler) {
      const disposeProxy = this.runProxy(s, this.scheduler)
      this.attachments.push(disposeProxy)

      return disposeProxy
    } else {
      this.queuedAttachments.push(s)

      return {
        dispose() {

        }
      }
    }
  }

  event(t: Time, v: A): void {
    const s = this.sinks

    for (let i = 0; i < s.length; ++i) {
      try {
        s[i].event(t, v)
      } catch (e) {
        s[i].error(t, e)
      }
    }
  }

  end(t: Time): void {
    const s = this.sinks
    for (let i = 0; i < s.length; ++i) {
      s[i].end(t)
    }
  }

  error(time: Time, err: Error): void {
    const s = this.sinks
    for (let i = 0; i < s.length; ++i) {
      s[i].error(time, err)
    }
  }

}


export const splitBehavior = <A, B>(pb: ProxyStream<B>): Sample<A, B> =>
  (...ob: any): Op<A, A> =>
    (sa) => {

      // @ts-ignore
      const oops: Op<A, B> = O(...ob)

      return {
        run(sink, scheduler) {
          return new SplitSink(oops, sa, pb, sink, scheduler)
        }
      }
    }


export interface Sample<A, B> {
  (o1: Op<A, B>): Op<A, A>
  <B1>(o1: Op<A, B1>, o2: Op<B1, B>): Op<A, A>
  <B1, B2>(o1: Op<A, B1>, o2: Op<B1, B2>, o3: Op<B2, B>): Op<A, A>
  <B1, B2, B3>(o1: Op<A, B1>, o2: Op<B1, B2>, o3: Op<B2, B3>, o4: Op<B3, any>, ...oos: Op<any, B>[]): Op<A, A>
}
export type Behavior<A, B> = [Sample<A, B>, Stream<B>]

export const split = <A, B>(): Behavior<A, B> => {
  const prox = new ProxyStream<B>()
  const behavior = splitBehavior(prox)

  return [behavior, prox]
}

class SplitSink<A, B> implements Disposable {

  saDispoable: Disposable = disposeNone()

  constructor(bb: Op<A, B>, sa: Stream<A>, proxy: ProxyStream<B>, sink: Sink<A>, scheduler: Scheduler) {

    this.saDispoable = sa.run({
      event(t: Time, ev: A) {
        sink.event(t, ev)
        proxy.attach(bb(startWith(ev, never())))
      },
      error() { },
      end() { }
    }, scheduler)

  }

  dispose(): void {
    this.saDispoable.dispose()
  }

}



