import { map, mergeArray, never, now, propagateTask, scan, skipRepeatsWith } from '@most/core'
import { disposeAll, disposeBoth } from '@most/disposable'
import { id } from '@most/prelude'
import { asap } from '@most/scheduler'
import type { Disposable, Scheduler, Sink, Stream, Time } from '@most/types'
import { O, isFunction } from '../../core/common.js'
import type { Ops } from '../../core/types.js'
import { filterNull } from '../../utils/combinator.js'
import type { $Node, IBranch, IBranchElement, IComposeOrSeed, INode } from '../types.js'
import { SettableDisposable } from '../utils/SettableDisposable.js'

class NodeSource<A, B extends IBranchElement> implements Stream<IBranch<B>> {
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

    return disposeBoth(asap(propagateTask(runAt, nodeState, sink), scheduler), disposable)
  }
}

const runAt = <T>(t: Time, x: T, sink: Sink<T>) => sink.event(t, x)

export function branch<A, B extends IBranchElement>(sourceOp: (a: A) => B, postOp: Ops<IBranch<B>, IBranch<B>> = id) {
  return (composeOrSeed: A): IComposeOrSeed<$Node, B> => {
    return function nodeComposeFn(...input: any[]): any {
      if (input.some(isFunction)) {
        const composedOps = O(postOp, ...input)

        return branch(sourceOp, composedOps)(composeOrSeed)
      }

      const $segments = input.length ? (input as $Node<B>[]) : [never()]
      const $branch = new NodeSource(composeOrSeed, sourceOp, $segments)

      return postOp($branch)
    }
  }
}

class TextSource implements Stream<INode<Text>> {
  constructor(private textSourceList: (Stream<string> | string)[]) {}

  run(sink: Sink<INode<Text>>, scheduler: Scheduler): Disposable {
    const disposableList = this.textSourceList.map((textSource) => {
      const sourceDisposable = new SettableDisposable()

      if (typeof textSource === 'string') {
        const runDisposable = now({
          disposable: sourceDisposable,
          element: document.createTextNode(textSource)
        }).run(sink, scheduler)

        return disposeBoth(runDisposable, sourceDisposable)
      }

      let createdTextNode: Text

      const runDisposable = filterNull(
        map((nextValue) => {
          if (createdTextNode) {
            createdTextNode.nodeValue = nextValue
            return null
          }

          createdTextNode = document.createTextNode(nextValue)

          return {
            disposable: sourceDisposable,
            element: createdTextNode
          }
        }, textSource)
      ).run(sink, scheduler)

      return disposeBoth(runDisposable, sourceDisposable)
    })
    return disposeAll(disposableList)
  }
}

export const $text = (...textSourceList: (Stream<string> | string)[]) => new TextSource(textSourceList)

export const $svg = branch(<K extends keyof SVGElementTagNameMap>(a: K) =>
  document.createElementNS('http://www.w3.org/2000/svg', a)
)
export const $element = branch(<K extends keyof HTMLElementTagNameMap>(a: K) => document.createElement(a))
export const $custom = branch((a: string) => document.createElement(a))
export const $node = $custom('node')
export const $p = $element('p')

export const $wrapNativeElement = branch(<A extends IBranchElement>(rootNode: A) => rootNode)
