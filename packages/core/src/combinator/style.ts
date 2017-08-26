import { Stream, Sink, Scheduler, Disposable } from '@most/types'
import { curry2, CurriedFunction2 } from '@most/prelude'
import { NodeStreamType, NodeStreamLike } from '../types'
import { map } from '@most/core'
import { nullSink } from '../utils'


export type IStyleProperties = {[N in keyof CSSStyleDeclaration]?: any }
export type StyleLike = Stream<IStyleProperties>
export type StyleBehaviorFn = (s: NodeStreamType) => StyleLike



export interface StyleEffectCurry {
  (input: IStyleProperties, els: NodeStreamType): NodeStreamType
  (input: IStyleProperties): (els: NodeStreamType) => NodeStreamType
}

export const applyStyle = (style: IStyleProperties, el: HTMLElement) => {
  let prop: keyof CSSStyleDeclaration
  // const declaration = el.style as IStyleProperties
  for (prop in style) el.style[prop as any] = style[prop]

  return el
}

export const ApplyStyleCurry: StyleEffectCurry = curry2(applyStyle)

export const style: CurriedFunction2<IStyleProperties, Stream<Node>, Stream<Node>> =
  curry2((style: IStyleProperties, node: NodeStreamLike) => map(ApplyStyleCurry(style), node))


export class StyleBehavior implements NodeStreamLike {
  constructor (private bfn: StyleBehaviorFn, private ns: NodeStreamLike) { }

  run (sink: Sink<Node>, scheduler: Scheduler): Disposable {
    return this.ns.run(new StyleBehaviorSink(sink, scheduler, this.bfn), scheduler)
  }

}

class StyleBehaviorSink implements Sink<NodeStreamType> {
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

export const styleB = (ss: StyleBehaviorFn, ns: NodeStreamLike) => new StyleBehavior(ss, ns)

export const styleBehaviour = curry2(styleB)


