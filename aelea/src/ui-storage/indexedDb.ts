export type GetKey<TSchema> = Extract<keyof TSchema, string | number>

export interface IDbParams<TName extends string = string> {
  name: TName
  keyPath?: string | string[] | null
  autoIncrement?: boolean
}

export interface IDbStoreParams {
  name: string
  options?: IDBObjectStoreParameters
  dbQuery: Promise<IDBDatabase>
}

export interface IStoreConfig<TState, TType extends { [P in keyof TState]: TState[P] }> {
  initialState: TType
  options?: IDBObjectStoreParameters
}

export interface IStoreDefinition<T, Type extends { [P in keyof T]: T[P] } = any>
  extends IDbStoreParams,
    IStoreConfig<T, Type> {}

export async function set<TSchema, TKey extends GetKey<TSchema>, TData extends TSchema[TKey]>(
  params: IStoreDefinition<TSchema>,
  key: IDBValidKey,
  data: TData
): Promise<TData> {
  const db = await params.dbQuery
  const tx = db.transaction(params.name, 'readwrite')
  const store = tx.objectStore(params.name)

  return request(store.put(data, key))
}

export async function get<TSchema, TKey extends GetKey<TSchema>, TData extends TSchema[TKey]>(
  params: IStoreDefinition<TSchema>,
  key: TKey
): Promise<TData> {
  const db = await params.dbQuery
  const store = db.transaction(params.name, 'readonly').objectStore(params.name)
  const value = await request<TData>(store.get(key))

  return value === undefined ? params.initialState[key] : value
}

export async function add<TResult>(params: IDbStoreParams, list: TResult[]): Promise<TResult[]> {
  const db = await params.dbQuery
  const store = db.transaction(params.name, 'readwrite').objectStore(params.name)
  const requestList = list.map((item) => request(store.add(item)))

  await Promise.all(requestList)
  return list
}

export async function clear<TResult>(params: IDbStoreParams): Promise<TResult> {
  const db = await params.dbQuery
  const store = db.transaction(params.name, 'readwrite').objectStore(params.name)
  return request(store.clear())
}

export async function cursor(
  params: IDbStoreParams,
  query?: IDBValidKey | IDBKeyRange | null,
  direction?: IDBCursorDirection
): Promise<IDBCursorWithValue | null> {
  const db = await params.dbQuery
  const store = db.transaction(params.name, 'readwrite').objectStore(params.name)
  return request(store.openCursor(query, direction))
}

export function openDatabase<TName extends string>(
  name: TName,
  version: number,
  storeParamList: IDbParams[]
): Promise<IDBDatabase> {
  const openDbRequest = indexedDB.open(name, version)

  openDbRequest.onupgradeneeded = (_) => {
    const db = openDbRequest.result
    try {
      for (const params of storeParamList) {
        if (db.objectStoreNames.contains(params.name)) {
          openDbRequest.result.deleteObjectStore(params.name)
        }

        openDbRequest.result.createObjectStore(params.name, params)
      }
    } catch (e) {
      throw e instanceof Error ? e : new Error('Unknown error')
    }
  }

  return request(openDbRequest)
}

function request<TResult>(req: IDBRequest<any>): Promise<TResult> {
  return new Promise<TResult>((resolve, reject) => {
    req.onerror = (err) => reject(req.error || new Error(`${err.type}: Unknown error`))
    req.onsuccess = () => {
      resolve(req.result)
    }
  })
}
