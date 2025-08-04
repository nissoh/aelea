import { empty, type ISink, type IStream, merge, PipeSink } from '../../stream/index.js'
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

class DynamicTextSink extends PipeSink<string, ISlottable<Text>> {
  private textNode: Text | null = null
  private emitted = false

  constructor(
    sink: ISink<ISlottable<Text>>,
    private readonly disposable: SettableDisposable,
    private readonly scheduler: I$Scheduler
  ) {
    super(sink)
  }

  event(value: string): void {
    if (!this.emitted) {
      // First emission - create text node and emit it
      this.textNode = document.createTextNode(value)
      this.emitted = true
      // DOM tree creation happens in asap phase
      this.scheduler.asap(
        eventText,
        {
          element: this.textNode,
          disposable: this.disposable
        },
        this.sink
      )
    } else if (this.textNode) {
      // Subsequent emissions - just update the text content
      this.textNode.nodeValue = value
    }
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
  return stream((sink, scheduler) => {
    const disposable = new SettableDisposable()
    // DOM tree creation happens in asap phase
    scheduler.asap(
      eventText,
      {
        element: document.createTextNode(text),
        disposable
      },
      sink
    )

    return disposable
  })
}

function eventText(value: ISlottable<Text>, sink: ISink<ISlottable<Text>>): void {
  sink.event(value)
}
