import { Stream, Sink, Scheduler, Disposable } from '@most/types'
import { curry2, CurriedFunction2 } from '@most/prelude'
import { NodeStream } from '../types'
import { map } from '@most/core'
import { nullSink } from '../utils'


export type IStyleProperties = {[N in keyof CSSStyleDeclaration]?: any }
export type StyleLike = Stream<IStyleProperties>
export type StyleBehaviorFn = (s: Node) => StyleLike



export interface StyleEffectCurry {
  (input: IStyleProperties, els: Node): Node
  (input: IStyleProperties): (els: Node) => Node
}

export const applyStyle = (style: IStyleProperties, el: HTMLElement) => {
  let prop: keyof CSSStyleDeclaration
  // const declaration = el.style as IStyleProperties
  for (prop in style) el.style[prop as any] = style[prop]

  return el
}

export const ApplyStyleCurry: StyleEffectCurry = curry2(applyStyle)

export const style: CurriedFunction2<IStyleProperties, Stream<Node>, Stream<Node>> =
  curry2((style: IStyleProperties, node: NodeStream) => map(ApplyStyleCurry(style), node))


export class StyleBehavior implements NodeStream {
  constructor (private bfn: StyleBehaviorFn, private ns: NodeStream) { }

  run (sink: Sink<Node>, scheduler: Scheduler): Disposable {
    return this.ns.run(new StyleBehaviorSink(sink, scheduler, this.bfn), scheduler)
  }

}

class StyleBehaviorSink implements Sink<Node> {
  styleDisposable: Disposable
  constructor (private sink: any, private scheduler: Scheduler, private bfn: StyleBehaviorFn) {

  }

  event (time: number, el: Node): void {
    this.sink.event(time, el)

    const event = (time: number, style: IStyleProperties) => {
      applyStyle(style, el as any)
    }

    this.styleDisposable =  this.bfn(el).run({...nullSink, event}, this.scheduler)
  }
  end (time: number): void {
    this.styleDisposable.dispose()
    this.sink.end(time)
  }
  error (time: number, err: Error): void {
    this.end(time)
    this.sink.error(time)
    throw err
  }

}

export const styleB = (ss: StyleBehaviorFn, ns: NodeStream) => new StyleBehavior(ss, ns)

export const styleBehaviour = curry2(styleB)


