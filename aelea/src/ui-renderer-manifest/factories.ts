import { createFactories } from '@/ui'

export class VirtualElement extends EventTarget {
  tagName: string
  className: string[] = []
  style: Record<string, string> = {}
  attrs: Record<string, string> = {}

  constructor(tag: string) {
    super()
    this.tagName = tag
  }
}

export class VirtualText extends EventTarget {
  constructor(public nodeValue: string) {
    super()
  }
}

export type INodeElementVdom = VirtualElement | VirtualText

const DECLARATION_MAP = {
  element: (tag: string) => new VirtualElement(tag),
  custom: (tag: string) => new VirtualElement(tag),
  node: () => new VirtualElement('div'),
  svg: (tag: string) => new VirtualElement(tag),
  wrap: <A extends INodeElementVdom>(rootNode: A) => rootNode,
  text: (value: string) => new VirtualText(value),
  setText: (el: VirtualElement | VirtualText, value: string) => {
    if (el instanceof VirtualText) {
      el.nodeValue = value
    } else {
      el.attrs.textContent = value
    }
  }
}

const factories = createFactories(DECLARATION_MAP)

export const $svg = factories.$svg
export const $element = factories.$element
export const $custom = factories.$custom
export const $node = factories.$node
export const $wrapNativeElement = factories.$wrapNativeElement

// Simple text factory for manifest (uses plain strings)
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

export type I$Text = IStream<ISlottable<VirtualText>>

function createDynamicTextStream(textSource: IStream<string>): I$Text {
  return stream((sink, scheduler) => {
    const textDisposable = new DynamicTextSink(sink, scheduler as I$Scheduler)
    return disposeBoth(textDisposable, textSource.run(textDisposable, scheduler))
  })
}

class DynamicTextSink implements ISink<string>, Disposable {
  textNode: ISlottable<VirtualText> | null = null
  disposed = false

  constructor(
    readonly sink: ISink<ISlottable<VirtualText>>,
    readonly scheduler: I$Scheduler
  ) {}

  event(time: ITime, value: string): void {
    if (this.disposed) return

    if (this.textNode === null) {
      this.textNode = {
        element: new VirtualText(value),
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

function emitText(time: ITime, sink: ISink<ISlottable<VirtualText>>, value: ISlottable<VirtualText>): void {
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
      element: new VirtualText(text),
      disposable
    }
    const emitTextDisposable = (scheduler as I$Scheduler).asap(propagateRunEventTask(sink, emitText, textNode))

    return disposeBoth(emitTextDisposable, disposable)
  })
}
