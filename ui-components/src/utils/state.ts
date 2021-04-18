
import { BehaviorSource, Op, Pipe, Sample } from "@aelea/core"
import { filter } from "@most/core"
import { merge } from "@most/core"
import { chain, combineArray, constant, multicast, skip, startWith, tap } from "@most/core"
import { curry2 } from "@most/prelude"
import { Disposable, Scheduler, Sink, Stream } from "@most/types"

type StreamInput<T> = {
  [P in keyof T]: Stream<T[P]>
}

type StreamInputArray<T extends any[]> = {
  [P in keyof T]: Stream<T[P]>
}

export type StateBehavior<A, B = A> = [Sample<A, B>, Stream<B>]

export function stateBehavior<A, B = A>(initialState: A): StateBehavior<B, A> {
  const bs = new BehaviorSource<A, B>()
  const mbs = multicast(bs)

  return [bs.sample, replayLatest(mbs, initialState)]
}


class StateSink<A> extends Pipe<A, A> {
  constructor(private parent: ReplayLatest<A>, public sink: Sink<A>) {
    super(sink)
  }

  event(t: number, x: A): void {
    this.parent.latestvalue = x
    this.parent.hasValue = true

    this.sink.event(t, x)
  }
}


export function replayLatest<A>(s: Stream<A>, initialState?: A): ReplayLatest<A> {
  if (arguments.length === 1) {
    return new ReplayLatest(s)
  } else {
    return new ReplayLatest(s, initialState)
  }
}


export class ReplayLatest<A> implements Stream<A> {
  latestvalue!: A
  hasValue = false
  hasInitial

  constructor(private source: Stream<A>,
              private initialState?: A,) {
    this.hasInitial = arguments.length === 2
  }

  run(sink: Sink<A>, scheduler: Scheduler): Disposable {
    const startWithReplay = this.hasValue
      ? startWith(this.latestvalue)
      : this.hasInitial
        ? startWith(this.initialState)
        : null

    const withReplayedValue = startWithReplay ? startWithReplay(this.source) : this.source

    return withReplayedValue.run(new StateSink(this, sink), scheduler)
  }

}


export function combineState<A, B extends A, K extends keyof A>(initialState: B, state: StreamInput<Partial<A>>): Stream<A> {
  const entries = Object.entries(state) as [keyof A, A[K]][]
  const streams = entries.map(([k, s]) => {
    return startWith(initialState[k], s as any)
  })

  const combinedWithInitial = combineArray((...arrgs) => {
    return arrgs.reduce((seed, val, idx) => {
      const key = entries[idx][0]
      seed[key] = val

      return seed
    }, { ...initialState })
  }, streams)

  return skip(1, combinedWithInitial)
}


// temorary typings fix for this issue https://github.com/mostjs/core/pull/543
export function combineArrayMap<A extends any[], B>(cb: (...args: A) => B, ...streamList: StreamInputArray<A>): Stream<B> {
  return combineArray(cb, streamList)
}


interface StoreFnCurry<STORE> {
  <Z>(writePipe: Op<Z, STORE> | undefined, s: Stream<Z>): Stream<Z>
  <Z>(writePipe?: Op<Z, STORE> | undefined): (s: Stream<Z>) => Stream<Z>
}

export type BrowserStore<STORE> = {
  state: STORE
  store: StoreFnCurry<STORE>
  craete: <T>(key: string, intitialState: T) => BrowserStore<T>
}


export const localStorageTreeFactory = (rootChainKey: string) => <T>(key: string, initialDefaultState: T): BrowserStore<T> => {
  const mktTree = `${rootChainKey}.${key}`
  const storeData = localStorage.getItem(mktTree)
  const initialState = storeData ? JSON.parse(storeData) as T : initialDefaultState

  const storeCurry: StoreFnCurry<T> = curry2((writePipe = (x => x), stream) => {
    const multicastSource = multicast(stream)
    const writeOp = writePipe(multicastSource)

    // ignore 
    const writeEffect = filter(state => {
      scope.state = state
      localStorage.setItem(mktTree, JSON.stringify(state))

      return false
    }, writeOp)

    return merge(writeEffect, multicastSource)
  })
  
  let _state = initialState

  const scope = {
    get state() {
      return _state
    },
    set state(newState) {
      _state = newState
    },
    store: storeCurry,
    craete: localStorageTreeFactory(mktTree)
  }

  return scope
}
  
  

