import { map } from '@most/core'
import { curry2 } from '@most/prelude'
import { Stream } from '@most/types'
import { $Branch, IBranchElement, StyleCSS } from '../types'


interface StyleCurry {
  <C extends IBranchElement, D>(styleInput: StyleCSS, node: $Branch<C, D>): $Branch<C, D>
  <C extends IBranchElement, D>(styleInput: StyleCSS): (node: $Branch<C, D>) => $Branch<C, D>
}

interface StyleBehaviorCurry {
  <C extends IBranchElement, D>(styleInput: Stream<StyleCSS | null>, node: $Branch<C, D>): $Branch<C, D>
  <C extends IBranchElement, D>(styleInput: Stream<StyleCSS | null>): (node: $Branch<C, D>) => $Branch<C, D>
}



function styleFn<C extends IBranchElement, D>(styleInput: StyleCSS, source: $Branch<C, D>): $Branch<C, D> {
  return map(node => ({ ...node, style: { ...node.style, ...styleInput } }), source)
}


// class StyleBehavior<T extends IBranchElement> implements $Branch<T> {

//   constructor(private $node: $Node, private style: Stream<StyleCSS | null>) { }

//   run(sink: Sink<IBranch<T>>, scheduler: Scheduler) {
//     // const styleBehaviorSink = new StyleBehaviorEffectSink(sink, this.style)
//     // const nodeDisposable = this.$node.run(styleBehaviorSink, scheduler)

//     // const [src, behavior] = tether(this.$node)

//     return this.$node.run(new StyleBehaviorEffectSink(sink, this.style), scheduler)

//     // return disposeBoth(nodeDisposable, styleBehaviorSink)
//   }
// }


// class StyleBehaviorEffectSink<T extends IBranchElement> extends Pipe<IBranch<T>> implements Disposable {


//   constructor(public sink: Sink<IBranch<T>>, private style: Stream<StyleCSS | null>) { super(sink) }

//   dispose(): void {
//     throw new Error('Method not implemented.')
//   }

//   event(t: number, x: IBranch<T, {}>): void {
//     this.sink.event(t, x)

//     applyStyleBehavior(this.style, x, this.config.styleCache)

//     // this.disposables.push(disposeStyle)


//   }
// }

function styleBehaviorFn<C extends IBranchElement, D>(style: Stream<StyleCSS | null>, $node: $Branch<C, D>): $Branch<C, D> {
  return map(node => ({ ...node, styleBehaviors: [...node.styleBehaviors, style] }), $node)
}


// applyStyle
export const style: StyleCurry = curry2(styleFn)
// export const stylePseudo: StylePseudoCurry = curry3(stylePseudoFn)
export const styleBehavior: StyleBehaviorCurry = curry2(styleBehaviorFn)

