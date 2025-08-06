import { disposeNone, empty, type ISink, type IStream, merge } from '../../stream/index.js'
import { stream } from '../stream.js'
import type { I$Scheduler, ISlottable } from '../types.js'
import { SettableDisposable } from '../utils/SettableDisposable.js'

export type I$Text = IStream<ISlottable<Text>>

function createDynamicTextStream(textSource: IStream<string>): I$Text {
  return stream((sink, scheduler) => {
    return new DynamicTextSink(sink, scheduler, textSource)
  })
}

class DynamicTextSink implements ISink<string>, Disposable {
  private textNode: ISlottable<Text> | null = null
  private currentDisposable: Disposable = disposeNone
  private sourceDisposable: Disposable

  constructor(
    readonly sink: ISink<ISlottable<Text>>,
    readonly scheduler: I$Scheduler,
    textSource: IStream<string>
  ) {
    this.sourceDisposable = textSource.run(this, scheduler)
  }

  event(value: string): void {
    if (this.textNode === null) {
      // First emission - create text node and emit it
      this.textNode = {
        element: document.createTextNode(value),
        disposable: new SettableDisposable()
      }
      // DOM tree creation happens in asap phase
      this.currentDisposable = this.scheduler.asap(emitText, this.sink, this.textNode)
    } else if (this.textNode) {
      // Subsequent emissions - just update the text content
      this.textNode.element.nodeValue = value
    }
  }

  end(): void {
    this.sink.end()
  }

  error(e: any): void {
    this.sink.error(e)
  }

  [Symbol.dispose](): void {
    this.sourceDisposable[Symbol.dispose]()
    this.currentDisposable[Symbol.dispose]()
    this.textNode = null
    this.sourceDisposable = disposeNone
  }
}

function emitText(sink: ISink<ISlottable<Text>>, value: ISlottable<Text>): void {
  sink.event(value)
}

export const $text = (...textSourceList: (IStream<string> | string)[]): I$Text => {
  if (textSourceList.length === 0) return empty

  if (textSourceList.length === 1) {
    const source = textSourceList[0]
    return typeof source === 'string' ? createStaticTextStream(source) : createDynamicTextStream(source)
  }

  const streams = textSourceList.map(source =>
    typeof source === 'string' ? createStaticTextStream(source) : createDynamicTextStream(source)
  )

  return merge(...streams)
}

function createStaticTextStream(text: string): I$Text {
  return stream((sink, scheduler) => {
    const disposable = new SettableDisposable()
    // DOM tree creation happens in asap phase
    scheduler.asap(emitText, sink, {
      element: document.createTextNode(text),
      disposable
    })

    return disposable
  })
}
