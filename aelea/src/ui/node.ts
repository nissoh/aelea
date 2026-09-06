import {
  disposeNone,
  empty,
  type IScheduler,
  type ISink,
  type IStream,
  type ITime,
  isFunction,
  merge,
  propagateRunEventTask
} from '../stream/index.js'
import { MountPort } from './mount.js'
import type {
  I$Node,
  I$Op,
  I$Slottable,
  I$Text,
  IElementDescriptor,
  IInstanceHandle,
  INode,
  INodeCompose,
  IRecipe,
  ITextNode
} from './types.js'

function emitNode<T>(time: ITime, sink: ISink<T>, value: T): void {
  sink.event(time, value)
}

type Mutator<TElement> = (recipe: IRecipe<TElement>) => void

/**
 * Optimization hints, not different objects: an op-free compose result is a
 * fully functional node stream that ALSO carries its recipe, so a renderer may
 * materialize it inline without subscribing. Any other consumer observes it as
 * a plain stream. `NODE_BRAND` holds the `IRecipe`; `TEXT_BRAND` holds the
 * text source (`string | IStream<string>`).
 */
export const NODE_BRAND = Symbol('aelea/static-node')
export const TEXT_BRAND = Symbol('aelea/static-text')

/**
 * One subscription's node: its own mount port and its own removal handle,
 * so a dynamic node costs the instance and its emission task and nothing else.
 */
class NodeInstance<TElement> extends MountPort<TElement> implements INode<TElement>, IInstanceHandle {
  readonly kind = 'node' as const
  readonly mount: NodeInstance<TElement> = this
  readonly disposable: NodeInstance<TElement> = this
  task: Disposable = disposeNone
  private entry: Disposable | null = null
  private disposed = false

  constructor(readonly recipe: IRecipe<TElement>) {
    super()
  }

  set(disposable: Disposable): void {
    if (this.entry !== null) throw new Error('Disposable already set')
    this.entry = disposable
    if (this.disposed) disposable[Symbol.dispose]()
  }

  [Symbol.dispose](): void {
    if (this.disposed) return
    this.disposed = true
    this.task[Symbol.dispose]()
    const entry = this.entry
    if (entry !== null) {
      this.entry = null
      entry[Symbol.dispose]()
    }
  }
}

class TextInstance implements ITextNode, IInstanceHandle {
  readonly kind = 'text' as const
  readonly disposable: TextInstance = this
  task: Disposable = disposeNone
  private entry: Disposable | null = null
  private disposed = false

  constructor(readonly value: string | IStream<string>) {}

  set(disposable: Disposable): void {
    if (this.entry !== null) throw new Error('Disposable already set')
    this.entry = disposable
    if (this.disposed) disposable[Symbol.dispose]()
  }

  [Symbol.dispose](): void {
    if (this.disposed) return
    this.disposed = true
    this.task[Symbol.dispose]()
    const entry = this.entry
    if (entry !== null) {
      this.entry = null
      entry[Symbol.dispose]()
    }
  }
}

class NodeBranch<TElement> implements I$Node<TElement> {
  constructor(readonly recipe: IRecipe<TElement>) {}

  run(sink: ISink<INode<TElement>>, scheduler: IScheduler): Disposable {
    const node = new NodeInstance(this.recipe)
    const native = this.recipe.element.native
    if (native !== undefined) node.resolve(native as TElement)
    node.task = scheduler.asap(propagateRunEventTask(sink, emitNode, node))
    return node
  }
}

class TextBranch implements I$Text {
  constructor(readonly value: string | IStream<string>) {}

  run(sink: ISink<ITextNode>, scheduler: IScheduler): Disposable {
    const text = new TextInstance(this.value)
    text.task = scheduler.asap(propagateRunEventTask(sink, emitNode, text))
    return text
  }
}

export function createNode<TElement>(
  element: IElementDescriptor,
  mutators: Mutator<TElement>[] = [],
  streamOps: I$Op<TElement>[] = []
): INodeCompose<TElement> {
  const nodeComposeFn = (...input: (I$Op<unknown> | I$Slottable<unknown>)[]): INodeCompose | I$Node => {
    if (input.some(isFunction)) {
      const newMutators = mutators.slice()
      const newStreamOps = streamOps.slice()
      let inStreamPhase = newStreamOps.length > 0
      for (const op of input as I$Op<TElement>[]) {
        const mut = (op as unknown as { __mutate?: Mutator<TElement> }).__mutate
        if (typeof mut === 'function' && !inStreamPhase) {
          newMutators.push(mut)
        } else {
          newStreamOps.push(op)
          inStreamPhase = true
        }
      }
      return createNode(element, newMutators, newStreamOps)
    }

    const recipe: IRecipe<TElement> = {
      element,
      $segments: input as I$Slottable<TElement>[],
      staticStyles: [],
      styleBehavior: [],
      attributes: {},
      attributesBehavior: [],
      propBehavior: [],
      effects: []
    }
    for (let i = 0; i < mutators.length; i++) mutators[i](recipe)

    let result: I$Node<TElement> = new NodeBranch(recipe)
    for (let i = 0; i < streamOps.length; i++) result = streamOps[i](result)
    if (streamOps.length === 0) {
      ;(result as unknown as Record<symbol, unknown>)[NODE_BRAND] = recipe
    }
    return result
  }

  return nodeComposeFn as INodeCompose<TElement>
}

export function $element<K extends keyof HTMLElementTagNameMap>(tag: K): INodeCompose<HTMLElementTagNameMap[K]>
export function $element(tag?: string): INodeCompose<HTMLElement>
export function $element(tag = 'div') {
  return createNode<HTMLElement>({ tag, namespace: 'html' })
}

export function $svg<K extends keyof SVGElementTagNameMap>(tag: K): INodeCompose<SVGElementTagNameMap[K]>
export function $svg(tag: string): INodeCompose<SVGElement>
export function $svg(tag: string) {
  return createNode<SVGElement>({ tag, namespace: 'svg' })
}

export function $custom(tag: string): INodeCompose<HTMLElement> {
  return createNode<HTMLElement>({ tag, namespace: 'html' })
}

export const $node: INodeCompose<HTMLElement | SVGElement> = createNode<HTMLElement | SVGElement>({
  tag: 'div',
  namespace: 'html'
})

export function $wrapNativeElement<T extends Element = Element>(element: T): INodeCompose<T> {
  return createNode<T>({
    tag: (typeof element.tagName === 'string' && element.tagName.toLowerCase()) || 'div',
    namespace: 'html',
    native: element
  })
}

/**
 * A text child. A string mounts inline; a stream binds its emissions to one
 * persistent text node. Each subscription carries its own removal handle so
 * a switch over text nodes replaces instead of accumulating.
 */
export const $text = (...textSourceList: (IStream<string> | string)[]): I$Text => {
  if (textSourceList.length === 0) return empty

  const streams = textSourceList.map(source => {
    const $branch = new TextBranch(source)
    ;($branch as unknown as Record<symbol, unknown>)[TEXT_BRAND] = source
    return $branch as I$Text
  })

  return streams.length === 1 ? streams[0] : merge(...streams)
}
