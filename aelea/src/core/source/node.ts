import { never, propagateTask } from '@most/core'
import { disposeBoth } from '@most/disposable'
import { id } from '@most/prelude'
import { asap } from '@most/scheduler'
import type { Disposable, Scheduler, Sink, Stream } from '@most/types'
import { type IOps, isFunction, O } from '../../core/common.js'
import type { IAttributeProperties } from '../combinator/attribute.js'
import type { IStyleCSS } from '../combinator/style.js'
import { type ISettableDisposable, SettableDisposable } from '../utils/SettableDisposable.js'

export type IText = Stream<Text>
export type INodeElement = Node & ChildNode
export type IBranchElement = HTMLElement | SVGElement

export interface INode<A extends INodeElement = INodeElement> {
  element: A
  disposable: ISettableDisposable
}

export interface IBranch<A extends IBranchElement = IBranchElement, B = {}> extends INode<A> {
  $segments: I$Node[]
  insertAscending: boolean
  style?: IStyleCSS
  stylePseudo: Array<{ style: IStyleCSS; class: string }>
  styleBehavior: Stream<IStyleCSS | null>[]

  attributes?: IAttributeProperties<B>
  attributesBehavior: Stream<IAttributeProperties<B>>[]
}

export type I$Node<A extends INodeElement = INodeElement> = Stream<INode<A>>

export type I$Branch<A extends IBranchElement = IBranchElement, B = {}> = Stream<IBranch<A, B>>

export interface INodeCompose<TChildren, A extends IBranchElement = IBranchElement, B = {}, C = {}> {
  <BB1, CC1>(o1: IOps<IBranch<A, B>, IBranch<A, BB1>>): INodeCompose<TChildren, A, B & BB1, C & CC1>
  <BB1, CC1, BB2, CC2>(
    o1: IOps<IBranch<A, B>, IBranch<A, BB1>>,
    o2: IOps<IBranch<A, BB1>, IBranch<A, BB1>>
  ): INodeCompose<TChildren, A, B & BB1 & BB2, C & CC1 & CC2>
  <BB1, CC1, BB2, CC2, BB3, CC3>(
    o1: IOps<IBranch<A, B>, IBranch<A, BB1>>,
    o2: IOps<IBranch<A, BB1>, IBranch<A, BB1>>,
    o3: IOps<IBranch<A, BB1>, IBranch<A, BB1>>
  ): INodeCompose<TChildren, A, B & BB1 & BB2 & BB3, C & CC1 & CC2 & CC3>
  <BB1, CC1, BB2, CC2, BB3, BB4, CC3, CC4>(
    o1: IOps<IBranch<A, B>, IBranch<A, BB1>>,
    o2: IOps<IBranch<A, BB1>, IBranch<A, BB1>>,
    o3: IOps<IBranch<A, BB1>, IBranch<A, BB1>>,
    o4: IOps<IBranch<A, BB1>, IBranch<A, BB1>>
  ): INodeCompose<TChildren, A, B & BB1 & BB2 & BB3 & BB4, C & CC1 & CC2 & CC3 & CC4>
  <BB1, CC1, BB2, CC2, BB3, BB4, CC3, CC4, BB5, CC5>(
    o1: IOps<IBranch<A, B>, IBranch<A, BB1>>,
    o2: IOps<IBranch<A, BB1>, IBranch<A, BB1>>,
    o3: IOps<IBranch<A, BB1>, IBranch<A, BB1>>,
    o4: IOps<IBranch<A, BB1>, IBranch<A, BB1>>,
    ...o5: IOps<IBranch<A, unknown>, IBranch<A, BB1>>[]
  ): INodeCompose<TChildren, A, B & BB1 & BB2 & BB3 & BB4 & BB5, C & CC1 & CC2 & CC3 & CC4 & CC5>

  (...$childrenSegment: TChildren[]): I$Branch<A>
}

class NodeSource<A, B extends IBranchElement> implements Stream<IBranch<B>> {
  constructor(
    private sourceValue: A,
    private sourceOp: (a: A) => B,
    private $segments: I$Node[]
  ) {}

  run(sink: Sink<IBranch<B>>, scheduler: Scheduler): Disposable {
    const element = this.sourceOp(this.sourceValue)
    const $segments = this.$segments
    const disposable = new SettableDisposable()

    const nodeState: IBranch<B> = {
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

export function createNode<A, B extends IBranchElement>(
  sourceOp: (a: A) => B,
  postOp: IOps<IBranch<B>, IBranch<B>> = id
) {
  return (seedValue: A): INodeCompose<I$Node, B> => {
    return function nodeComposeFn(...input: any[]): any {
      if (input.some(isFunction)) {
        const composedOps = O(postOp, ...input)

        return createNode(sourceOp, composedOps)(seedValue)
      }

      const $segments = input.length ? (input as I$Node<B>[]) : [never()]
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

export const $wrapNativeElement = createNode(<A extends IBranchElement>(rootNode: A) => rootNode)
