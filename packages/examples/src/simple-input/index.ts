
import { switchLatest, map, merge, at, tap } from '@most/core'
import { pipe, xForver } from '../utils'
import { nullSink, component, domEvent, style, branch, text } from  'fufu'
import { newDefaultScheduler } from '@most/scheduler'
import { mainCentered } from '../style/stylesheet'
import { field } from '../common/form'
import { column, row } from '../common/flex'
import { Disposable, Scheduler, Sink, Stream, Time } from '@most/types'


const input = field('full name', { placeholder: 'e.g. David Choe' })

const actions = {
  fufu: pipe(domEvent('input'), map(x => (x.target as HTMLInputElement).value + '-fufu'))
}

const inputComponenet = component(actions, ({ fufu }) =>
  column(
    fufu.attach(input),
    style({ position: 'absolute', top: '0' }, row(
      switchLatest(map(text, fufu))
    ))
  )
)


branch(xForver(document.body))(
  mainCentered(inputComponenet)
)
.run(nullSink, newDefaultScheduler())




export interface Port<A> {
  event (value: A): void
  close (e?: Error): void
}

export const createPort = <A> (): FanoutPortStream<A> => {
  const ports: Port<A>[] = []
  return new FanoutPortStream(ports)
}



export class FanoutPortStream<A> {
  constructor (private readonly ports: Port<A>[]) {}

  event (a: A): void {
    this.ports.forEach(p => p.event(a))
  }

  close (e?: Error): void {
    this.ports.forEach(p => p.close(e))
  }

  run (sink: Sink<A>, scheduler: Scheduler): Disposable {
    const s = new SinkPort(sink, scheduler)
    this.ports.push(s)
    return new RemovePortDisposable(s, this.ports)
  }
}

export class RemovePortDisposable<A> {
  constructor (private readonly port: Port<A>, private readonly ports: Port<A>[]) {}

  dispose () {
    const i = this.ports.indexOf(this.port)
    if (i >= 0) {
      this.ports.splice(i, 1)
    }
  }
}

export class SinkPort<A> implements Port<A> {
  constructor (public readonly sink: Sink<A>, public readonly scheduler: Scheduler) {}

  event (a: A): void {
    tryEvent(this.scheduler.currentTime(), a, this.sink)
  }

  close (e?: Error): void {
    if (e) {
      this.sink.error(this.scheduler.currentTime(), e)
    } else {
      tryEnd(this.scheduler.currentTime(), this.sink)
    }
  }
}

function tryEvent <A> (t: Time, a: A, sink: Sink<A>) {
  try {
    sink.event(t, a)
  } catch (e) {
    sink.error(t, e)
  }
}

function tryEnd <A> (t: Time, sink: Sink<A>) {
  try {
    sink.end(t)
  } catch (e) {
    sink.error(t, e)
  }
}


const portStream = createPort<string>()


tap(console.log, portStream).run(nullSink, newDefaultScheduler())
tap(console.log, portStream).run(nullSink, newDefaultScheduler())


// setTimeout(x => portStream.event('fff'), 1000)
