import { map, never, now, switchLatest } from '@most/core'
import { id } from '@most/prelude'
import { Disposable, Scheduler, Sink, Stream } from '@most/types'
import { $Node, $Branch, INode, IBranch, IBranchElement, Op } from '../types'
import { isFunction, O } from '../utils'
import SettableDisposable from '../utils/SettableDisposable'


export const $svg = branch(<K extends keyof SVGElementTagNameMap>(a: K) => document.createElementNS('http://www.w3.org/2000/svg', a))
export const $element = branch(<K extends keyof HTMLElementTagNameMap>(a: K) => document.createElement(a))
export const $custom = branch((a: string) => document.createElement(a))
export const $node = $custom('node')

export const $wrapNativeElement = branch(<A extends IBranchElement>(rootNode: A) => rootNode)
// childless nodes
export const $text = $textFn(id)


export class NodeSource<A, B extends IBranchElement> implements Stream<IBranch<B>> {
  constructor(private sourceValue: A,
              private sourceOp: (a: A) => B,
              private $segments: $Node[]) { }

  run(sink: Sink<IBranch<B>>, scheduler: Scheduler): Disposable {

    const element = this.sourceOp(this.sourceValue)
    const $segments = this.$segments
    const disposable = new SettableDisposable()

    sink.event(scheduler.currentTime(), {
      $segments, element, disposable,
      styleBehavior: [],
      attributesBehavior: [],
      stylePseudo: []
    })

    return disposable
  }
}

function node(text: string): $Node<Text> {
  return {
    run(sink, scheduler) {
      const element = document.createTextNode(text)
      const disposable = new SettableDisposable()

      sink.event(scheduler.currentTime(), { element, disposable })

      return disposable
    }
  }
}


export function branch<A, B extends IBranchElement>(sourceOp: (a: A) => B, postOp: Op<IBranch<B>, IBranch<B>> = id) {
  return (sourceOpValue: A): NodeComposeFn<$Node, B> => {
    return function nodeComposeFn(...input: any[]): any {
      if (input.some(isFunction))
        // @ts-ignore
        return branch(sourceOp, O(postOp, ...input) as Op<IBranch<B>, IBranch<B>>)(sourceOpValue)

      const $segments = input.length ? input as $Node<B>[] : [never()]
      const $branch = new NodeSource(sourceOpValue, sourceOp, $segments)

      return postOp($branch)
    }
  }
}


function $textFn<A extends HTMLElement>(postOp: Op<IBranch<A>, IBranch<A>> = O(x => x)): NodeComposeFn<string | Stream<string>, A> {
  return function textComp(...input: any[]) {
    if (input.some(isFunction))
      // @ts-ignore
      return $textFn(O(postOp, ...input) as Op<IBranch<A>, IBranch<A>>) as any

    const children: Stream<INode<Text>>[] = input.map((x) => {
      const strStream = typeof x === 'string' ? now(x) : x as Stream<string>

      return switchLatest(map(node, strStream))
    })

    return branch(() => document.createElement('text'), postOp)(null)(...children)
  }
}


export interface NodeComposeFn<TChildren, A extends IBranchElement = IBranchElement, B = {}, C = {}> {
  <BB1, CC1>(o1: Op<IBranch<A, B>, IBranch<A, BB1>>): NodeComposeFn<TChildren, A, B & BB1, C & CC1>
  <BB1, CC1, BB2, CC2>(o1: Op<IBranch<A, B>, IBranch<A, BB1>>, o2: Op<IBranch<A, BB1>, IBranch<A, BB1>>): NodeComposeFn<TChildren, A, B & BB1 & BB2, C & CC1 & CC2>
  <BB1, CC1, BB2, CC2, BB3, CC3>(o1: Op<IBranch<A, B>, IBranch<A, BB1>>, o2: Op<IBranch<A, BB1>, IBranch<A, BB1>>, o3: Op<IBranch<A, BB1>, IBranch<A, BB1>>): NodeComposeFn<TChildren, A, B & BB1 & BB2 & BB3, C & CC1 & CC2 & CC3>
  <BB1, CC1, BB2, CC2, BB3, BB4, CC3, CC4>(o1: Op<IBranch<A, B>, IBranch<A, BB1>>, o2: Op<IBranch<A, BB1>, IBranch<A, BB1>>, o3: Op<IBranch<A, BB1>, IBranch<A, BB1>>, o4: Op<IBranch<A, BB1>, IBranch<A, BB1>>): NodeComposeFn<TChildren, A, B & BB1 & BB2 & BB3 & BB4, C & CC1 & CC2 & CC3 & CC4>
  <BB1, CC1, BB2, CC2, BB3, BB4, CC3, CC4, BB5, CC5>(o1: Op<IBranch<A, B>, IBranch<A, BB1>>, o2: Op<IBranch<A, BB1>, IBranch<A, BB1>>, o3: Op<IBranch<A, BB1>, IBranch<A, BB1>>, o4: Op<IBranch<A, BB1>, IBranch<A, BB1>>, ...o5: Op<IBranch<A, unknown>, IBranch<A, BB1>>[]): NodeComposeFn<TChildren, A, B & BB1 & BB2 & BB3 & BB4 & BB5, C & CC1 & CC2 & CC3 & CC4 & CC5>

  (...$childrenSegment: TChildren[]): $Branch<A>
}
