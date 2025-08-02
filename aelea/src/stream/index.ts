/// <reference path="./utils/global.d.ts" />

export {
  chain,
  combine,
  combineState,
  constant,
  continueWith,
  debounce,
  delay,
  during,
  filter,
  filterNull,
  fromPromise,
  join,
  map,
  merge,
  mergeArray,
  mergeConcurrently,
  mergeMapConcurrently,
  sample,
  scan,
  since,
  skip,
  skipRepeats,
  skipRepeatsWith,
  slice,
  snapshot,
  startWith,
  switchLatest,
  switchMap,
  take,
  tap,
  throttle,
  until,
  zip,
  zipArray
} from './combinator/index.js'
export { behavior, multicast, replayLatest, replayState, tether } from './multicast/index.js'
export { runPromise, runStream } from './run.js'
export {
  at,
  empty,
  fromArray,
  never,
  now,
  periodic
} from './source/index.js'
export { stream } from './stream.js'
export type {
  Args,
  Fn,
  IBehavior,
  IComposeBehavior,
  ICreateStream,
  IOps,
  IScheduler,
  ISink,
  IStream,
  ITask
} from './types.js'
export { isEmpty, isFunction, isStream, maybeOps, nullSink, toStream } from './utils/common.js'
export {
  disposeAll,
  disposeBoth,
  disposeNone,
  disposeOnce,
  disposeWith,
  isDisposable,
  toDisposable,
  tryDispose
} from './utils/disposable.js'
export type { Curried2, Curried3, Curried4 } from './utils/function.js'
export { curry2, curry3, curry4, o, op } from './utils/function.js'
export { MergingSink, PipeSink } from './utils/sink.js'
