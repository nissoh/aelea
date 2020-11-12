
type FnInputList<A extends unknown[]> = { [k in keyof A]: A[k] extends (a: infer A) => any ? A : never }
type MatchFnRet<A> = { [k in keyof A]: A[k] extends (a: any) => infer R ? R : never }

type Head<R extends unknown[]> = R[0] // [a,b,c] => a
type Last<R extends unknown[]> = R extends [...infer _, infer L] ? L : undefined // [a,b,c] => c

type Tail<R extends unknown[]> = R extends [any, ...infer T] ? T : [] // [a,b,c] => [b,c]
type Lead<R extends unknown[]> = R extends [...infer L, any] ? L : [] // [a,b,c] => [a,b]


export type Compose<R extends unknown[]> = Tail<FnInputList<R>> extends Lead<MatchFnRet<R>> ? (a: Head<FnInputList<R>>) => Last<MatchFnRet<R>> : never
