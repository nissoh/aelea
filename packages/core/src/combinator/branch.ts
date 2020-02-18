// import {Disposable, Sink, Scheduler, Time, Stream} from '@most/types'
// import {NodeStream, ElementStream, ElementType, NodeType, ElementNode, Func} from '../types'
// import {curry2, compose} from '@most/prelude'
// import {map, snapshot, join, merge, never, chain, startWith, now, tap} from '@most/core'
// import {nullSink} from '../'


// interface Branch {
//   <A extends HTMLElement, B extends Node>(ps: ElementStream<A>): (cs: NodeStream<B>) => ElementStream<A>
//   <A extends HTMLElement, B extends Node>(ps: ElementStream<A>, cs: NodeStream<B>): ElementStream<A>
// }



// export const branch: Branch = curry2((ps, cs) => ({
//   run(sink, scheduler) {
//     return ps.run(new BranchSink(cs, sink, scheduler), scheduler)
//   }
// }))
// // export const branch: Branch = curry2((ps, cs) => {
// //   return map(([parentEl, pfs]) => {

// //     // return [parentEl, merge(pfs, map(([childEl, cfs]) =>  appendChild(childEl), cs))]
// //     return [parentEl, pfs]

// //   }, ps)

// // })

// class BranchSink<A extends ElementType, B extends NodeType, C> implements Sink<ElementNode<A, C>> {
//   innerChild: Sink<ElementNode<B>> = nullSink

//   constructor(
//     private cs: NodeStream<B>,
//     private sink: Sink<ElementNode<A, C>>,
//     private scheduler: Scheduler
//   ) {}

//   event(t: Time, [parent, pf]: ElementNode<A, C>) {


//     // const nsf = compose(
//     //   snapshot(([child, cfn], pfn) => {
//     //     appendChild(child, parent)

//     //     cfn(now(child)).run({
//     //       event(t, cfn) {
//     //         debugger
//     //         // cfn(child)
//     //       },
//     //       end(t) {
//     //       },
//     //       error(t, err) {
//     //       }
//     //     }, this.scheduler)


//     //     return pfn
//     //   }, this.cs),
//     //   pf
//     // )

//     // this.sink.event(t, [parent, nsf])
//   }

//   end(t: Time) {
//     // this.innerChild.end(t)
//     this.sink.end(t)
//   }

//   error(t: Time, e: Error) {
//     this.sink.error(t, e)
//   }
// }

// // class InnerChildSink<A extends ElementType, B extends NodeType> {
// //   childrenList: NodeType[] = []
// //   childDisposable = this.cs.run(this, this.scheduler)

// //   constructor(
// //     private cs: NodeStream<B>,
// //     private scheduler: Scheduler,
// //     private parent: A,
// //     private parentSink: any
// //   ) {}

// //   event(t: Time, [child, csf]: ElementNode<B>): void {
// //     this.parent.appendChild(child)

// //     // this.parentSink.event(t, [child, csf])
// //   }
// //   end(t: Time): void {
// //     this.dispose()
// //   }
// //   error(t: Time, err: Error): void {
// //     this.end(t)
// //     throw (err)
// //   }

// //   dispose() {
// //     this.childDisposable.dispose()
// //   }
// // }




// export {Disposable}


