import {
  disposeBoth,
  empty,
  type Fn,
  type ISink,
  type IStream,
  type ITime,
  isFunction,
  merge,
  never,
  propagateRunEventTask,
  SettableDisposable
} from '@/stream'
import { stream } from '@/stream-extended'
import type {
  DeclarationMap,
  I$Node,
  I$Op,
  I$Scheduler,
  I$Slottable,
  I$Text,
  INode,
  INodeCompose,
  ISlottable,
  NodeKind
} from './types.js'

function emitNode<T>(time: ITime, sink: ISink<T>, value: T): void {
  sink.event(time, value)
}

let declarationMap: DeclarationMap<any> | null = null

export function setDeclarationMap<TElement>(map: DeclarationMap<TElement>): void {
  declarationMap = map as DeclarationMap<any>
}

const resolveDeclarationMap = <TElement>(): DeclarationMap<TElement> => {
  if (!declarationMap) {
    throw new Error('No renderer declaration map set. Call setDeclarationMap in your renderer entry.')
  }
  return declarationMap as DeclarationMap<TElement>
}

function createNode<TElement>(
  kind: NodeKind,
  tag: string | null,
  createElement: () => TElement,
  postOp: Fn<I$Node<TElement>, I$Node<TElement>> = <T>(x: T): T => x
): INodeCompose<TElement> {
  const nodeComposeFn = (
    ...input: (I$Op<TElement> | I$Slottable<TElement>)[]
  ): INodeCompose<TElement> | I$Node<TElement> => {
    if (input.some(isFunction)) {
      const ops = input as I$Op<TElement>[]
      const composedOps = [postOp, ...ops].reduce((acc, fn) => (x: I$Node<TElement>) => fn(acc(x)))

      return createNode(kind, tag, createElement, composedOps)
    }

    const $segments = input.length ? (input as I$Slottable<TElement>[]) : [never]
    const $branch = stream((sink, scheduler) => {
      const disposable = new SettableDisposable()
      const element = createElement()

      const nodeState: INode<TElement> = {
        kind,
        tag,
        $segments,
        element,
        disposable,
        styleBehavior: [],
        styleInline: [],
        style: {},
        insertAscending: true,
        attributesBehavior: [],
        attributes: {},
        stylePseudo: []
      }

      const nodeTask = scheduler.asap(propagateRunEventTask(sink, emitNode, nodeState))

      return disposeBoth(disposable, nodeTask)
    })

    return postOp($branch)
  }

  return nodeComposeFn as INodeCompose<TElement>
}

export function createFactories<TElement>(map: DeclarationMap<TElement>) {
  return {
    $element: (tag = 'div') => createNode('element', tag, () => map.element(tag)),
    $custom: (tag: string) => createNode('custom', tag, () => map.custom(tag)),
    $svg: (tag: string) => createNode('svg', tag, () => map.svg(tag)),
    $node: () => createNode('node', 'node', () => map.node()),
    $wrapNativeElement: (element: TElement) => createNode('wrap', null, () => map.wrap(element))
  }
}

const lazyFactories = () => ({
  $element: (tag = 'div') => createNode('element', tag, () => resolveDeclarationMap().element(tag)),
  $custom: (tag: string) => createNode('custom', tag, () => resolveDeclarationMap().custom(tag)),
  $svg: (tag: string) => createNode('svg', tag, () => resolveDeclarationMap().svg(tag)),
  $node: () => createNode('node', 'node', () => resolveDeclarationMap().node()),
  $wrapNativeElement: <TElement>(element: TElement) =>
    createNode('wrap', null, () => resolveDeclarationMap<TElement>().wrap(element))
})

export const $element = (tag = 'div') => lazyFactories().$element(tag)
export const $custom = (tag: string) => lazyFactories().$custom(tag)
export const $node: INodeCompose = ((...args: any[]) => {
  const compose = lazyFactories().$node()
  return compose(...args)
}) as INodeCompose
export const $svg = (tag: string) => lazyFactories().$svg(tag)
export const $wrapNativeElement = <TElement>(element: TElement) => lazyFactories().$wrapNativeElement(element)

const setTextContent = <TElement>(map: DeclarationMap<TElement>, element: TElement, value: string): void => {
  if (map.setText) {
    map.setText(element, value)
    return
  }

  if ('nodeValue' in (element as any)) {
    ;(element as any).nodeValue = value
    return
  }

  if ('textContent' in (element as any)) {
    ;(element as any).textContent = value
  }
}

const createTextElement = <TElement>(map: DeclarationMap<TElement>, value: string): TElement => {
  if (map.text) return map.text(value)

  const element = map.node()
  setTextContent(map, element, value)
  return element
}

function createDynamicTextStream(textSource: IStream<string>): I$Text {
  return stream((sink, scheduler) => {
    const textDisposable = new DynamicTextSink(sink, scheduler as I$Scheduler, resolveDeclarationMap())
    return disposeBoth(textDisposable, textSource.run(textDisposable, scheduler))
  })
}

function createStaticTextStream(text: string): I$Text {
  return stream((sink, scheduler) => {
    const map = resolveDeclarationMap()
    const disposable = new SettableDisposable()
    const textNode = {
      element: createTextElement(map, text),
      disposable
    }
    const emitTextDisposable = (scheduler as I$Scheduler).asap(propagateRunEventTask(sink, emitText, textNode))

    return disposeBoth(emitTextDisposable, disposable)
  })
}

class DynamicTextSink<TElement> implements ISink<string>, Disposable {
  textNode: ISlottable<TElement> | null = null
  disposed = false

  constructor(
    readonly sink: ISink<ISlottable<TElement>>,
    readonly scheduler: I$Scheduler,
    readonly map: DeclarationMap<TElement>
  ) {}

  event(time: ITime, value: string): void {
    if (this.disposed) return

    if (this.textNode === null) {
      this.textNode = {
        element: createTextElement(this.map, value),
        disposable: new SettableDisposable()
      }
      this.scheduler.asap(propagateRunEventTask(this.sink, emitText, this.textNode))
    } else {
      setTextContent(this.map, this.textNode.element, value)
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

function emitText<TElement>(time: ITime, sink: ISink<ISlottable<TElement>>, value: ISlottable<TElement>): void {
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
