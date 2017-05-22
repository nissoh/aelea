import { Stream, Sink, Scheduler, ScheduledTask, Disposable } from '@most/types'
import { curry2, CurriedFunction2 } from '@most/prelude'
import { NodeStreamLike, NodeStreamType } from './'
import { splitStream } from './split'
import { inputComposition } from './utils'

export type IStyleProperties = { [N in keyof CSSStyleDeclaration]?: any }
export type StyleLike = Stream<IStyleProperties>

export const applyStyle = (style: IStyleProperties, el: HTMLElement) => {
  let prop: keyof CSSStyleDeclaration
  const declaration = el.style as IStyleProperties

  for (prop in style) {
    el.style[prop as any] = style[prop]
  }
}

export class Style implements NodeStreamLike {
  constructor (private style: inputComposition<NodeStreamType, IStyleProperties>,
               private ns: NodeStreamLike) { }

  run (sink: Sink<NodeStreamType>, scheduler: Scheduler) {
    const styleSink = new StyleSink(this.style, sink, scheduler)
    return this.ns.run(styleSink, scheduler)
  }
}

class StyleSink<NodeStreamType> implements Sink<NodeStreamType> {
  styleSnapshot: any
  constructor (private style: inputComposition<NodeStreamType, IStyleProperties>,
               private sink: Sink<NodeStreamType>,
               private scheduler: Scheduler) { }

  event (t: number, el: NodeStreamType) {

    const styleSink = {
      event (t, style) {
        // analyze style and detarmine abstraction in order to about layout trashing
        // https://gist.github.com/paulirish/5d52fb081b3570c81e3a
        applyStyle(style, el as any)
      },
      error (t, e) {
        throw e
      },
      end (t) {}
    } as Sink<IStyleProperties>

    this.style({
      run (sink, scheduler) {
        sink.event(scheduler.now(), el)

        // should the styles that were applied be reverted back to their original values?
        return { dispose () {} }
      }
    }).run(styleSink, this.scheduler)

    this.sink.event(t, el)

  }

  end (t: number) {}

  error (t: number, e: Error) {
    throw e
  }

}

export const style = (input: inputComposition<NodeStreamType, IStyleProperties>, els: NodeStreamLike) => {
  return new Style(input, els)
}
