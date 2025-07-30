import { type Fn, isFunction, O } from '../../core/common.js'
import type { IStream, Scheduler, Sink } from '../../stream/index.js'
import type { IAttributeProperties } from '../combinator/attribute.js'
import type { IStyleCSS } from '../combinator/style.js'
import { type ISettableDisposable, SettableDisposable } from '../utils/SettableDisposable.js'

export type ISlottableElement = ChildNode
export type INodeElement = HTMLElement | SVGElement

export type I$Slottable<A extends ISlottableElement = ISlottableElement> = IStream<ISlottable<A>>

export interface ISlottable<A extends ISlottableElement = ISlottableElement> {
  element: A
  disposable: ISettableDisposable
}

export interface INode<A extends INodeElement = INodeElement> extends ISlottable<A> {
  $segments: I$Slottable[]
  insertAscending: boolean
  style?: IStyleCSS
  stylePseudo: Array<{ style: IStyleCSS; class: string }>
  styleBehavior: IStream<IStyleCSS | null>[]

  attributes?: IAttributeProperties<any>
  attributesBehavior: IStream<IAttributeProperties<any>>[]
}

export type I$Node<A extends INodeElement = INodeElement> = IStream<INode<A>>

export type I$Op<TElement extends INodeElement = INodeElement> = (x: I$Node<TElement>) => I$Node<TElement>

export interface INodeCompose<TElement extends INodeElement = INodeElement> {
  (op1: I$Op<TElement>): INodeCompose<TElement>
  (op1: I$Op<TElement>, op2: I$Op<TElement>): INodeCompose<TElement>
  (op1: I$Op<TElement>, op2: I$Op<TElement>, op3: I$Op<TElement>): INodeCompose<TElement>
  (op1: I$Op<TElement>, op2: I$Op<TElement>, op3: I$Op<TElement>, op4: I$Op<TElement>): INodeCompose<TElement>
  (
    op1: I$Op<TElement>,
    op2: I$Op<TElement>,
    op3: I$Op<TElement>,
    op4: I$Op<TElement>,
    op5: I$Op<TElement>
  ): INodeCompose<TElement>
  (
    op1: I$Op<TElement>,
    op2: I$Op<TElement>,
    op3: I$Op<TElement>,
    op4: I$Op<TElement>,
    op5: I$Op<TElement>,
    op6: I$Op<TElement>
  ): INodeCompose<TElement>
  (
    op1: I$Op<TElement>,
    op2: I$Op<TElement>,
    op3: I$Op<TElement>,
    op4: I$Op<TElement>,
    op5: I$Op<TElement>,
    op6: I$Op<TElement>,
    op7: I$Op<TElement>
  ): INodeCompose<TElement>
  (
    op1: I$Op<TElement>,
    op2: I$Op<TElement>,
    op3: I$Op<TElement>,
    op4: I$Op<TElement>,
    op5: I$Op<TElement>,
    op6: I$Op<TElement>,
    op7: I$Op<TElement>,
    op8: I$Op<TElement>
  ): INodeCompose<TElement>
  (
    op1: I$Op<TElement>,
    op2: I$Op<TElement>,
    op3: I$Op<TElement>,
    op4: I$Op<TElement>,
    op5: I$Op<TElement>,
    op6: I$Op<TElement>,
    op7: I$Op<TElement>,
    op9: I$Op<TElement>
  ): INodeCompose<TElement>
  (
    op1: I$Op<TElement>,
    op2: I$Op<TElement>,
    op3: I$Op<TElement>,
    op4: I$Op<TElement>,
    op5: I$Op<TElement>,
    op6: I$Op<TElement>,
    op8: I$Op<TElement>,
    op9: I$Op<TElement>,
    op10: I$Op<TElement>
  ): INodeCompose<TElement>
  (...$leafs: I$Slottable[]): I$Node<TElement>
}

class NodeSource<A, B extends INodeElement> implements I$Node<B> {
  constructor(
    private readonly sourceValue: A,
    private readonly sourceOp: (a: A) => B,
    private readonly $segments: I$Slottable[]
  ) {}

  run(sink: Sink<INode<B>>, scheduler: Scheduler): Disposable {
    const element = this.sourceOp(this.sourceValue)
    const $segments = this.$segments
    const disposable = new SettableDisposable()

    const nodeState: INode<B> = {
      $segments,
      element,
      disposable,
      styleBehavior: [],
      insertAscending: true,
      attributesBehavior: [],
      stylePseudo: []
    }

    return disposeBoth(
      asap(
        propagateTask((t, x, sink) => sink.event(t, x), nodeState, sink),
        scheduler
      ),
      disposable
    )
  }
}

export function createNode<A, B extends INodeElement>(sourceOp: (a: A) => B, postOp: Fn<I$Node<B>, I$Node<B>> = id) {
  return (seedValue: A): INodeCompose<B> => {
    return function nodeComposeFn(...input: any[]): any {
      if (input.some(isFunction)) {
        const composedOps = O(postOp, ...input)

        return createNode(sourceOp, composedOps)(seedValue)
      }

      const $segments = input.length ? (input as I$Slottable[]) : [never()]
      const $branch = new NodeSource(seedValue, sourceOp, $segments)

      return postOp($branch)
    }
  }
}

export const $svg = createNode(<K extends keyof SVGElementTagNameMap>(a: K) =>
  document.createElementNS('http://www.w3.org/2000/svg', a)
)
export const $element = createNode(<K extends keyof HTMLElementTagNameMap>(a: K) => document.createElement(a))
export const $custom = createNode((a: string) => document.createElement(a))
export const $node = $custom('node')
export const $p = $element('p')

export const $wrapNativeElement = createNode(<A extends INodeElement>(rootNode: A) => rootNode)
