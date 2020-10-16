// import { Scheduler, Sink, Stream, Disposable, Time } from '@most/types'
// import { Pipe } from 'src/utils'
// import { combineArray } from '@most/core'


// export type StateTree<A> = {
//   [P in keyof A]: StateTreeSource<[A[P]]>
// }

// export class StateTreeSource<A> implements Stream<A> {

//   constructor(
//     private state: StateTree<A> | A
//   ) { }


//   run(sink: Sink<A>, scheduler: Scheduler): Disposable {
//     return new StateSink(sink, scheduler, this.state)
//   }
// }



// class StateSink<A> extends Pipe<A, A> implements Disposable {

//   constructor(
//     public sink: Sink<A>,
//     public scheduler: Scheduler,
//     private state: StateTree<A> | A
//   ) {
//     super(sink)

//     const keys = Object.keys(this.state).filter(k => (<any>this.state)[k] instanceof StateTreeSource)

//     const streams = keys.map(k => (<any>this.state)[k])

//     combineArray((...ss) => ss.reduce((acc: Object, value, index) => ({
//       ...acc,
//       [keys[index]]: acc
//     }), {}), streams).run(this, scheduler)

//   }

//   event(t: Time, x: A) {
//     console.log(x)
//   }

//   dispose(): void {
//     throw new Error("Method not implemented.")
//   }

//   getLatestState() {

//     // recur non pimitive
//     if (this.state instanceof Object) {
//       return Object.keys(this.state).reduce((acc, k) => ({
//         [k]: acc
//       }), {})
//     }

//     return this.state;
//   }

// }


// export const define = <A>(state: StateTree<A> | A) => {
//   return new StateTreeSource(state)
// }







