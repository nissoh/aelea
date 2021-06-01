import { O, Op, Pipe } from '@aelea/utils'
import { filter } from "@most/core"
import { merge } from "@most/core"
import { multicast, startWith } from "@most/core"
import { Disposable, Scheduler, Sink, Stream } from "@most/types"



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



export function replayLatest<A>(s: Stream<A>, initialState?: A): ReplayLatest<A> {
  if (arguments.length === 1) {
    return new ReplayLatest(s)
  } else {
    return new ReplayLatest(s, initialState)
  }
}


type StoreFn<STORE> = <Z>(stream: Stream<Z>, writePipe: Op<Z, STORE>) => Stream<Z>

export type BrowserStore<STORE> = {
  state: STORE
  store: StoreFn<STORE>
  craete: <T>(key: string, intitialState: T) => BrowserStore<T>
}


export const createLocalStorageChain = (keyChain: string) => <STORE>(key: string, initialDefaultState: STORE): BrowserStore<STORE> => {
  const mktTree = `${keyChain}.${key}`
  const storeData = localStorage.getItem(mktTree)
  const initialState = storeData ? JSON.parse(storeData) as STORE : initialDefaultState

  const storeCurry: StoreFn<STORE> = <Z>(stream: Stream<Z>, writePipe: Op<Z, STORE>) => {
    const multicastSource = multicast(stream)
    const writeOp = writePipe(multicastSource)

    // ignore 
    const writeEffect: Stream<never> = filter(state => {
      scope.state = state
      localStorage.setItem(mktTree, JSON.stringify(state))

      return false
    }, writeOp)

    return merge(writeEffect, multicastSource)
  }
  
  let _state = initialState

  const scope = {
    get state() {
      return _state
    },
    set state(newState) {
      _state = newState
    },
    store: storeCurry,
    craete: createLocalStorageChain(mktTree)
  }

  return scope
}

  

