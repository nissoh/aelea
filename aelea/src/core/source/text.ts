import { disposeNone, empty, type ISink, type IStream, merge } from '../../stream/index.js'
import { stream } from '../stream.js'
import type { I$Scheduler, ISlottable } from '../types.js'
import { SettableDisposable } from '../utils/SettableDisposable.js'

export type I$Text = IStream<ISlottable<Text>>

function createDynamicTextStream(textSource: IStream<string>): I$Text {
  return stream((sink, scheduler) => {
    const disposable = new SettableDisposable()
    return textSource.run(new DynamicTextSink(sink, disposable, scheduler), scheduler)
  })
}

class DynamicTextSink implements ISink<string> {
  private textNode: Text | null = null
  private currentDisposable: Disposable = disposeNone

  constructor(
    readonly sink: ISink<ISlottable<Text>>,
    private readonly disposable: SettableDisposable,
    private readonly scheduler: I$Scheduler
  ) {}

  event(value: string): void {
    if (this.textNode === null) {
      // First emission - create text node and emit it
      this.textNode = document.createTextNode(value)
      // DOM tree creation happens in asap phase
      this.currentDisposable = this.scheduler.asap(emitText, this.sink, {
        element: this.textNode,
        disposable: this.disposable
      })
    } else if (this.textNode) {
      // Subsequent emissions - just update the text content
      this.textNode.nodeValue = value
    }
  }

  end(): void {
    this.currentDisposable[Symbol.dispose]()
    this.currentDisposable = disposeNone
    this.textNode = null
    this.sink.end()
  }

  error(e: any): void {
    this.sink.error(e)
  }
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

function emitText(sink: ISink<ISlottable<Text>>, value: ISlottable<Text>): void {
  sink.event(value)
}
