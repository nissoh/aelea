import { empty, type ISink, type IStream, merge } from '../../stream/index.js'
import { stream } from '../stream.js'
import type { I$Scheduler, ISlottable } from '../types.js'
import { SettableDisposable } from '../utils/SettableDisposable.js'

export type I$Text = IStream<ISlottable<Text>>

function createDynamicTextStream(textSource: IStream<string>): I$Text {
  return stream((scheduler, sink) => {
    const disposable = new SettableDisposable()
    return textSource.run(scheduler, new DynamicTextSink(sink, disposable, scheduler))
  })
}

class DynamicTextSink implements ISink<string> {
  private textNode: Text | null = null
  private emitted = false

  constructor(
    private readonly sink: ISink<ISlottable<Text>>,
    private readonly disposable: SettableDisposable,
    private readonly scheduler: I$Scheduler
  ) {}

  event(value: string): void {
    if (!this.emitted) {
      // First emission - create text node and emit it
      this.textNode = document.createTextNode(value)
      this.emitted = true
      // DOM tree creation happens in asap phase
      this.scheduler.asap(this.sink, eventText, {
        element: this.textNode,
        disposable: this.disposable
      })
    } else if (this.textNode) {
      // Subsequent emissions - just update the text content
      this.textNode.nodeValue = value
    }
  }

  error(error: unknown): void {
    this.sink.error(error)
  }

  end(): void {
    this.sink.end()
  }
}

export const $text = (...textSourceList: (IStream<string> | string)[]): I$Text => {
  if (textSourceList.length === 0) return empty

  if (textSourceList.length === 1) {
    const source = textSourceList[0]
    return typeof source === 'string' ? createStaticTextStream(source) : createDynamicTextStream(source)
  }

  const streams = textSourceList.map((source) =>
    typeof source === 'string' ? createStaticTextStream(source) : createDynamicTextStream(source)
  )

  return merge(...streams)
}

function createStaticTextStream(text: string): I$Text {
  return stream((scheduler, sink) => {
    const disposable = new SettableDisposable()
    // DOM tree creation happens in asap phase
    scheduler.asap(sink, eventText, {
      element: document.createTextNode(text),
      disposable
    })

    return disposable
  })
}

function eventText(sink: ISink<ISlottable<Text>>, value: ISlottable<Text>): void {
  sink.event(value)
}
