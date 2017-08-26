// require('jsdom-global')()

// import { it } from '@typed/test'
// import { node } from '../index'
// import { runEffects, tap, take } from '@most/core'
// import { Stream, Scheduler } from '@most/types'
// import { newDefaultScheduler } from '@most/scheduler'

// const defScheduler = newDefaultScheduler()

// export function collectEvents <T> (stream: Stream<T>, scheduler: Scheduler) {
//   const into: any = []
//   const s = tap(x => into.push({ time: scheduler.now(), value: x }), stream)
//   return runEffects(s, scheduler).then(() => into)
// }

// export const otherTest = it('Emits node', ({ ok, equal }) =>
//   collectEvents(take(1, node), defScheduler).then(x => {
//     return equal(x[0].value instanceof Node, true)
//   })
// )





