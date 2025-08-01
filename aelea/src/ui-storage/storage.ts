import { continueWith, debounce, type IStream, now, switchMap } from '../stream/index.js'
import { type GetKey, get, type IStoreDefinition, openDatabase, set } from './indexedDb.js'

/*
Example usage of the store definition

import { uiStorage } from '@puppet-copy/middleware/ui-storage'
import { arbitrum } from 'viem/chains'

export const localStore = uiStorage.createStoreDefinition('root', 8, {
  globalStorage: {
    initialState: {
      chain: arbitrum.id,
      selectedList: [] as string[]
    }
  }
})

// changeSelectedList: ----[1]--[1,2]--[7]-->

const selectedList = uiStorage.replayWrite(localStore.globalStorage, changeSelectedList, 'selectedList')
[]
[1]
[1, 2]
[7]

*/

export const createStoreDefinition = <T, TDefinition extends { [P in keyof T]: IStoreDefinition<any>['initialState'] }>(
  dbName: string,
  dbVersion: number,
  definitions: TDefinition
): { [P in keyof TDefinition]: IStoreDefinition<TDefinition[P]['initialState']> } => {
  const defs = Object.entries(definitions).map(([key, initialState]: [string, any]) => {
    return {
      name: key,
      initialState
    }
  })

  const dbQuery = openDatabase(dbName, dbVersion, Object.values(defs))

  return defs.reduce(
    (acc, next) => {
      return {
        ...acc,
        [next.name]: {
          ...next,
          dbQuery
        }
      }
    },
    {} as { [P in keyof TDefinition]: IStoreDefinition<TDefinition[P]['initialState']> }
  )
}

export function write<TSchema, TKey extends GetKey<TSchema>, TData extends TSchema[TKey]>(
  params: IStoreDefinition<TSchema>,
  writeEvent: IStream<TData>,
  key: TKey,
  debounceMs = 100
): IStream<TData> {
  const debouncedWrite = debounce(debounceMs, writeEvent)
  return switchMap(async (data) => {
    await set(params, key, data)
    return data
  }, debouncedWrite)
}

export function replayWrite<TSchema, TKey extends GetKey<TSchema>, TReturn extends TSchema[TKey]>(
  params: IStoreDefinition<TSchema>,
  writeEvent: IStream<TReturn>,
  key: TKey,
  debounceMs = 100
): IStream<TReturn> {
  const storedValue = switchMap(() => get(params, key), now(null))
  const writeSrc = write(params, writeEvent, key, debounceMs)

  return continueWith(() => writeSrc, storedValue)
}

// export const localStore = createStoreDefinition('root', 8, {
//   globalStorage: {
//     selectedList: [] as string[]
//   }
// })

// const selectedList = replayWrite(localStore.globalStorage, now([]))
