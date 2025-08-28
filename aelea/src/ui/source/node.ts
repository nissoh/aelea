import { disposeBoth, type Fn, type ISink, isFunction, never } from '../../stream/index.js'
import { propagateRunEventTask } from '../../stream/scheduler/PropagateTask.js'
import { stream } from '../../stream-extended/index.js'
import type { I$Node, I$Op, I$Slottable, INode, INodeCompose, INodeElement } from '../types.js'
import { SettableDisposable } from '../utils/SettableDisposable.js'

function createNodeSource<A, B extends INodeElement>(
  sourceValue: A,
  sourceOp: (a: A) => B,
  $segments: I$Slottable[]
): I$Node<B> {
  return stream((sink, scheduler) => {
    const element = sourceOp(sourceValue)
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

    const nodeTask = scheduler.asap(propagateRunEventTask(sink, emitNode, nodeState))

    return disposeBoth(disposable, nodeTask)
  })
}

export function emitNode<T>(time: number, sink: ISink<T>, value: T): void {
  sink.event(time, value)
}

export function createNode<A, B extends INodeElement>(
  sourceOp: (a: A) => B,
  postOp: Fn<I$Node<B>, I$Node<B>> = <T>(x: T): T => x
) {
  return (seedValue: A): INodeCompose<B> => {
    const nodeComposeFn = (...input: (I$Op<B> | I$Slottable)[]): INodeCompose<B> | I$Node<B> => {
      // Check if any input is a function (operation)
      if (input.some(isFunction)) {
        // Type guard to ensure we only have operations
        const ops = input as I$Op<B>[]

        // Compose all operations including postOp
        const composedOps = [postOp, ...ops].reduce((acc, fn) => (x: I$Node<B>) => fn(acc(x)))

        return createNode(sourceOp, composedOps)(seedValue)
      }

      // Otherwise, treat as children (I$Slottable[])
      const $segments = input.length ? (input as I$Slottable[]) : [never]
      const $branch = createNodeSource(seedValue, sourceOp, $segments)

      return postOp($branch)
    }

    return nodeComposeFn as INodeCompose<B>
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
