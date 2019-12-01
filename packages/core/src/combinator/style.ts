import {Stream, Sink, Scheduler, Disposable} from '@most/types'
import {curry2, CurriedFunction2} from '@most/prelude'
import {NodeStream} from '../types'
import {tap} from '@most/core'
import {nullSink} from '../utils'

import * as CSS from 'csstype'


export type IStyleProperties = CSS.Properties<HTMLElement>
export type StyleLike = Stream<IStyleProperties>
export type IPipe = (s: Node) => StyleLike
export type IStyleBehavior = IPipe


export const applyStyle = (style: Partial<IStyleProperties>, el: HTMLElement) => {
  let prop: any

  const elementStyle = el.style
  for (prop in style) {
    elementStyle[prop] = (<any>style)[prop]
  }
  return el
}

export const applyStyleCurry = curry2(applyStyle)

export const style = (style: IStyleProperties, node: NodeStream) => tap(applyStyleCurry(style), node)




export class StyleBehavior implements NodeStream {
  constructor(private bfn: Stream<IStyleProperties>, private ns: NodeStream) {}

  run(sink: Sink<HTMLElement>, scheduler: Scheduler): Disposable {
    return this.ns.run(new StyleBehavriorSink(sink, scheduler, this.bfn), scheduler)
  }
}

export class StyleBehavriorSink implements Sink<HTMLElement> {
  styleDisposable: Disposable | undefined
  constructor(private sink: any, private scheduler: Scheduler, private bfn: Stream<IStyleProperties>) {

  }

  event(time: number, el: HTMLElement): void {
    this.sink.event(time, el)

    const event = (time: number, style: IStyleProperties) => {
      applyStyle(style, el as any)
    }

    this.styleDisposable = this.bfn.run({...nullSink, event}, this.scheduler)
  }
  end(time: number): void {
    if (this.styleDisposable) {
      this.styleDisposable.dispose()
    }

    this.sink.end(time)
  }
  error(time: number, err: Error): void {
    this.end(time)
    this.sink.error(time)
    throw err
  }

}



export const styleBehavior = (ss: Stream<IStyleProperties>, ns: Stream<HTMLElement>) => new StyleBehavior(ss, ns)


export {CurriedFunction2, Stream}
