import { disposeBoth, disposeNone, empty, type ISink, type IStream, merge } from '../../stream/index.js'
import { propagateRunEventTask } from '../../stream/scheduler/PropagateTask.js'
import { stream } from '../../stream-extended/index.js'
import type { I$Scheduler, ISlottable } from '../types.js'
import { SettableDisposable } from '../utils/SettableDisposable.js'

export type I$Text = IStream<ISlottable<Text>>

function createDynamicTextStream(textSource: IStream<string>): I$Text {
  return stream((sink, scheduler) => {
    const textDisposable = new DynamicTextSink(sink, scheduler as I$Scheduler)
    return disposeBoth(textDisposable, textSource.run(textDisposable, scheduler))
  })
}

class DynamicTextSink implements ISink<string>, Disposable {
  textNode: ISlottable<Text> | null = null
  currentDisposable: Disposable = disposeNone

  constructor(
    readonly sink: ISink<ISlottable<Text>>,
    readonly scheduler: I$Scheduler
  ) {}

  event(time: number, value: string): void {
    if (this.textNode === null) {
      // First emission - create text node and emit it
      this.textNode = {
        element: document.createTextNode(value),
        disposable: new SettableDisposable()
      }
      // DOM tree creation happens in asap phase
      this.currentDisposable = this.scheduler.asap(propagateRunEventTask(this.sink, emitText, this.textNode))
    } else if (this.textNode) {
      // Subsequent emissions - just update the text content
      this.textNode.element.nodeValue = value
    }
  }

  end(time: number): void {
    // this.sink.end()
  }

  error(time: number, e: unknown): void {
    this.sink.error(time, e)
  }

  [Symbol.dispose](): void {
    this.currentDisposable[Symbol.dispose]()
    this.textNode = null
  }
}

function emitText(time: number, sink: ISink<ISlottable<Text>>, value: ISlottable<Text>): void {
  sink.event(time, value)
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
    const textNode = {
      element: document.createTextNode(text),
      disposable
    }
    const emitTextDisposable = (scheduler as I$Scheduler).asap(propagateRunEventTask(sink, emitText, textNode))

    return disposeBoth(emitTextDisposable, disposable)
  })
}
