import {
  disposeBoth,
  empty,
  type ISink,
  type IStream,
  type ITime,
  merge,
  propagateRunEventTask
} from '../stream/index.js'
import { SettableDisposable } from '../stream/utils/SettableDisposable.js'
import { stream } from '../stream-extended/index.js'
import type { I$Scheduler, ISlottable } from '../ui/types.js'

export type I$Text = IStream<ISlottable<Text>>

function createDynamicTextStream(textSource: IStream<string>): I$Text {
  return stream((sink, scheduler) => {
    const textDisposable = new DynamicTextSink(sink, scheduler as I$Scheduler)
    return disposeBoth(textDisposable, textSource.run(textDisposable, scheduler))
  })
}

class DynamicTextSink implements ISink<string>, Disposable {
  textNode: ISlottable<Text> | null = null
  disposed = false

  constructor(
    readonly sink: ISink<ISlottable<Text>>,
    readonly scheduler: I$Scheduler
  ) {}

  event(time: ITime, value: string): void {
    if (this.disposed) return

    if (this.textNode === null) {
      this.textNode = {
        element: document.createTextNode(value),
        disposable: new SettableDisposable()
      }
      this.scheduler.asap(propagateRunEventTask(this.sink, emitText, this.textNode))
    } else {
      this.textNode.element.nodeValue = value
    }
  }

  end(time: ITime): void {}

  error(time: ITime, e: unknown): void {
    if (this.disposed) return
    this.sink.error(time, e)
  }

  [Symbol.dispose](): void {
    this.disposed = true
    this.textNode = null
  }
}

function emitText(time: ITime, sink: ISink<ISlottable<Text>>, value: ISlottable<Text>): void {
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
    const textNode = {
      element: document.createTextNode(text),
      disposable
    }
    const emitTextDisposable = (scheduler as I$Scheduler).asap(propagateRunEventTask(sink, emitText, textNode))

    return disposeBoth(emitTextDisposable, disposable)
  })
}
