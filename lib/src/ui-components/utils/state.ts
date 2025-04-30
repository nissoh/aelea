import { Op } from '../../core'
import { filter } from "@most/core"
import { merge } from "@most/core"
import { multicast } from "@most/core"
import { Stream } from "@most/types"


type StoreFn<STORE> = <Z>(stream: Stream<Z>, writePipe: Op<Z, STORE>) => Stream<Z>

export type BrowserStore<STORE, StoreKey extends string> = {
  state: STORE
  store: StoreFn<STORE>
  craete: <T, CreateStoreKey extends string>(key: CreateStoreKey, intitialState: T) => BrowserStore<T, `${StoreKey}.${CreateStoreKey}`>
}


export const createLocalStorageChain = (keyChain: string) => <STORE, TKey extends string>(key: TKey, initialDefaultState: STORE): BrowserStore<STORE, TKey> => {
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

