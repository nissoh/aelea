import { never, propagateTask } from '@most/core'
import { disposeBoth } from '@most/disposable'
import { id } from '@most/prelude'
import { asap } from '@most/scheduler'
import type { Disposable, Scheduler, Sink, Stream } from '@most/types'
import { O, isFunction } from '../../core/common.js'
import type { IBranchElement, INode, INodeElement, IOps } from '../../core/types.js'
import type { IAttrProperties } from '../combinator/attribute.js'
import type { IStyleCSS } from '../combinator/style.js'
import { SettableDisposable } from '../utils/SettableDisposable.js'

export interface IBranch<A extends IBranchElement = IBranchElement, B = {}> extends INode<A> {
  $segments: $Node[]
  insertAscending: boolean
  style?: IStyleCSS
  stylePseudo: Array<{ style: IStyleCSS; class: string }>
  styleBehavior: Stream<IStyleCSS | null>[]

  attributes?: IAttrProperties<B>
  attributesBehavior: Stream<IAttrProperties<B>>[]
}

export type $Node<A extends INodeElement = INodeElement> = Stream<INode<A>>

export type $Branch<A extends IBranchElement = IBranchElement, B = {}> = Stream<IBranch<A, B>>

export interface IBranchCompose<TChildren, A extends IBranchElement = IBranchElement, B = {}, C = {}> {
  <BB1, CC1>(o1: IOps<IBranch<A, B>, IBranch<A, BB1>>): IBranchCompose<TChildren, A, B & BB1, C & CC1>
  <BB1, CC1, BB2, CC2>(
    o1: IOps<IBranch<A, B>, IBranch<A, BB1>>,
    o2: IOps<IBranch<A, BB1>, IBranch<A, BB1>>
  ): IBranchCompose<TChildren, A, B & BB1 & BB2, C & CC1 & CC2>
  <BB1, CC1, BB2, CC2, BB3, CC3>(
    o1: IOps<IBranch<A, B>, IBranch<A, BB1>>,
    o2: IOps<IBranch<A, BB1>, IBranch<A, BB1>>,
    o3: IOps<IBranch<A, BB1>, IBranch<A, BB1>>
  ): IBranchCompose<TChildren, A, B & BB1 & BB2 & BB3, C & CC1 & CC2 & CC3>
  <BB1, CC1, BB2, CC2, BB3, BB4, CC3, CC4>(
    o1: IOps<IBranch<A, B>, IBranch<A, BB1>>,
    o2: IOps<IBranch<A, BB1>, IBranch<A, BB1>>,
    o3: IOps<IBranch<A, BB1>, IBranch<A, BB1>>,
    o4: IOps<IBranch<A, BB1>, IBranch<A, BB1>>
  ): IBranchCompose<TChildren, A, B & BB1 & BB2 & BB3 & BB4, C & CC1 & CC2 & CC3 & CC4>
  <BB1, CC1, BB2, CC2, BB3, BB4, CC3, CC4, BB5, CC5>(
    o1: IOps<IBranch<A, B>, IBranch<A, BB1>>,
    o2: IOps<IBranch<A, BB1>, IBranch<A, BB1>>,
    o3: IOps<IBranch<A, BB1>, IBranch<A, BB1>>,
    o4: IOps<IBranch<A, BB1>, IBranch<A, BB1>>,
    ...o5: IOps<IBranch<A, unknown>, IBranch<A, BB1>>[]
  ): IBranchCompose<TChildren, A, B & BB1 & BB2 & BB3 & BB4 & BB5, C & CC1 & CC2 & CC3 & CC4 & CC5>

  (...$childrenSegment: TChildren[]): $Branch<A>
}

class BranchSource<A, B extends IBranchElement> implements Stream<IBranch<B>> {
  constructor(
    private sourceValue: A,
    private sourceOp: (a: A) => B,
    private $segments: $Node[]
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

export function branch<A, B extends IBranchElement>(sourceOp: (a: A) => B, postOp: IOps<IBranch<B>, IBranch<B>> = id) {
  return (composeOrSeed: A): IBranchCompose<$Node, B> => {
    return function nodeComposeFn(...input: any[]): any {
      if (input.some(isFunction)) {
        const composedOps = O(postOp, ...input)

        return branch(sourceOp, composedOps)(composeOrSeed)
      }

      const $segments = input.length ? (input as $Node<B>[]) : [never()]
      const $branch = new BranchSource(composeOrSeed, sourceOp, $segments)

      return postOp($branch)
    }
  }
}

export const $svg = branch(<K extends keyof SVGElementTagNameMap>(a: K) =>
  document.createElementNS('http://www.w3.org/2000/svg', a)
)
export const $element = branch(<K extends keyof HTMLElementTagNameMap>(a: K) => document.createElement(a))
export const $custom = branch((a: string) => document.createElement(a))
export const $node = $custom('node')
export const $p = $element('p')

export const $wrapNativeElement = branch(<A extends IBranchElement>(rootNode: A) => rootNode)
