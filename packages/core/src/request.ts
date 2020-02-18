export type Request<R, S, T, A> = {
  readonly request: R,
  readonly perform: (r: R) => S,
  readonly handle: (t: T) => A
}

export const map = <R, S, T, A, B>(f: (a: A) => B, {request, perform, handle}: Request<R, S, T, A>): Request<R, S, T, B> =>
  ({request, perform, handle: t => f(handle(t))})

export const using = <R, S, T, U, A>(f: (s: S) => T, {request, perform, handle}: Request<R, S, U, A>): Request<R, T, U, A> =>
  ({request, perform: r => f(perform(r)), handle})

export const createRequest = <R, A>(request: R): Request<R, R, A, A> =>
  ({request, perform: r => r, handle: a => a})

export const performRequest = <R, S, A>({request, perform, handle}: Request<R, S, S, A>): A =>
  handle(perform(request))

export type ZipR<R extends readonly Request<any, any, any, any>[]> = {
  readonly [K in keyof R]: R[K] extends Request<infer R, any, any, any> ? R : never
}

export type ZipS<R extends readonly Request<any, any, any, any>[]> = {
  readonly [K in keyof R]: R[K] extends Request<any, infer S, any, any> ? S : never
}

export type ZipT<R extends readonly Request<any, any, any, any>[]> = {
  readonly [K in keyof R]: R[K] extends Request<any, any, infer T, any> ? T : never
}

export type ZipA<R extends readonly Request<any, any, any, any>[]> = {
  readonly [K in keyof R]: R[K] extends Request<any, any, any, infer A> ? A : never
}

export const zip = <Requests extends readonly Request<any, any, any, any>[]>(...requests: Requests): Request<ZipR<Requests>, ZipS<Requests>, ZipT<Requests>, ZipA<Requests>> =>
  ({
    request: requests.map(r => r.request) as any,
    perform: (rs: ZipR<Requests>): ZipS<Requests> => requests.map((r, i) => r.perform(rs[i])) as any,
    handle: (ts: ZipT<Requests>): ZipA<Requests> => requests.map((r, i) => r.handle(ts[i])) as any
  })