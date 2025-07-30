// Re-export combinator streams
export {
  combine,
  continueWith,
  filter,
  lswitch,
  map,
  merge,
  multicast,
  scan,
  tap
} from './combinator/index.js'
export { constant, startWith, switchLatest } from './compat.js'
export { disposeNone } from './core.js'
export { defaultEnv } from './env.js'
export type { Curried2, Curried3, Curried4 } from './function.js'
export { curry2, curry3, curry4, op } from './function.js'
export { runPromise, runStream } from './run.js'
export { MergingSink, TransformSink } from './sink.js'
export {
  at,
  empty,
  fromArray,
  fromPromise,
  never,
  now,
  periodic
} from './source/index.js'
export type { Disposable, Env, Fn, IStream, Scheduler, Sink, U2I } from './types.js'
