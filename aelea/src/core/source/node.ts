import { map, never, propagateTask } from '@most/core'
import { disposeBoth } from '@most/disposable'
import { id } from '@most/prelude'
import { asap } from '@most/scheduler'
import type { Disposable, Scheduler, Sink, Stream } from '@most/types'
import { type IOps, isFunction, O } from '../../core/common.js'
import type { IAttributeProperties } from '../combinator/attribute.js'
import type { IStyleCSS } from '../combinator/style.js'
import { type ISettableDisposable, SettableDisposable } from '../utils/SettableDisposable.js'

export type ISlottableElement = Slottable
export type INodeElement = HTMLElement | SVGElement

export type I$Slottable<A extends ISlottableElement = ISlottableElement> = Stream<ISlottable<A>>

export interface ISlottable<A extends ISlottableElement = ISlottableElement> {
  element: A
  disposable: ISettableDisposable
}

export interface INode<A extends INodeElement = INodeElement> extends ISlottable<A> {
  $segments: I$Slottable[]
  insertAscending: boolean
  style?: IStyleCSS
  stylePseudo: Array<{ style: IStyleCSS; class: string }>
  styleBehavior: Stream<IStyleCSS | null>[]

  attributes?: IAttributeProperties<any>
  attributesBehavior: Stream<IAttributeProperties<any>>[]
}

export type I$Node<A extends INodeElement = INodeElement> = Stream<INode<A>>

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

class NodeSource<A, B extends INodeElement> implements Stream<INode<B>> {
  constructor(
    private sourceValue: A,
    private sourceOp: (a: A) => B,
    private $segments: I$Slottable[]
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

export function createNode<A, B extends INodeElement>(sourceOp: (a: A) => B, postOp: IOps<INode<B>, INode<B>> = id) {
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
const eee = $p(map((xxxxx) => xxxxx))
