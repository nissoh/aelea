import {
  map,
  never,
  propagateTask,
  skipRepeats,
  switchLatest,
} from '@most/core'
import { disposeBoth } from '@most/disposable'
import { id } from '@most/prelude'
import { asap } from '@most/scheduler'
import type { Disposable, Scheduler, Sink, Stream, Time } from '@most/types'
import { O, isFunction } from '../../core/common.js'

import type {
  $Node,
  IBranch,
  IBranchElement,
  INode,
  NodeComposeFn,
} from '../types.js'
import type { Op } from '../utils.js'
import { SettableDisposable } from '../utils/SettableDisposable.js'

export const $svg = branch(<K extends keyof SVGElementTagNameMap>(a: K) =>
  document.createElementNS('http://www.w3.org/2000/svg', a),
)
export const $element = branch(<K extends keyof HTMLElementTagNameMap>(a: K) =>
  document.createElement(a),
)
export const $custom = branch((a: string) => document.createElement(a))
export const $node = $custom('node')

export const $wrapNativeElement = branch(
  <A extends IBranchElement>(rootNode: A) => rootNode,
)
// childless nodes
export const $text = $textFn(id)

class NodeSource<A, B extends IBranchElement> implements Stream<IBranch<B>> {
  constructor(
    private sourceValue: A,
    private sourceOp: (a: A) => B,
    private $segments: $Node[],
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
      stylePseudo: [],
    }

    return disposeBoth(
      asap(propagateTask(runAt, nodeState, sink), scheduler),
      disposable,
    )
  }
}

function runAt<A extends IBranchElement>(
  t: Time,
  x: IBranch<A>,
  sink: Sink<IBranch<A>>,
): void {
  sink.event(t, x)
}

function node(text: string): $Node<Text> {
  return {
    run(sink, scheduler) {
      const element = document.createTextNode(text)
      const disposable = new SettableDisposable()

      sink.event(scheduler.currentTime(), { element, disposable })

      return disposable
    },
  }
}

export function branch<A, B extends IBranchElement>(
  sourceOp: (a: A) => B,
  postOp: Op<IBranch<B>, IBranch<B>> = id,
) {
  return (sourceOpValue: A): NodeComposeFn<$Node, B> => {
    return function nodeComposeFn(...input: any[]): any {
      if (input.some(isFunction)) {
        // @ts-ignore
        const composedOps = O(postOp, ...input)

        return branch(
          sourceOp,
          composedOps as Op<IBranch<B>, IBranch<B>>,
        )(sourceOpValue)
      }

      const $segments = input.length ? (input as $Node<B>[]) : [never()]
      const $branch = new NodeSource(sourceOpValue, sourceOp, $segments)

      return postOp($branch)
    }
  }
}

function $textFn<A extends HTMLElement>(
  postOp: Op<IBranch<A>, IBranch<A>> = O((x) => x),
): NodeComposeFn<string | Stream<string>, A> {
  return function textComp(...input: any[]) {
    if (input.some(isFunction)) {
      // @ts-ignore
      const composedOps = O(postOp, ...input)

      return $textFn(composedOps as Op<IBranch<A>, IBranch<A>>) as any
    }

    const children: Stream<INode<Text>>[] = input.map((x) => {
      return typeof x === 'string'
        ? node(x)
        : switchLatest(map(node, skipRepeats(x)))
    })

    return branch(() => document.createElement('text'), postOp)(null)(
      ...children,
    )
  }
}
