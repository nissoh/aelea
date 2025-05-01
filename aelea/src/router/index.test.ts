// import { now, mergeArray, tap, runEffects, take } from "@most/core"
// import { curry2 } from "@most/prelude"
// import { newDefaultScheduler } from "@most/scheduler"
// import type { Time, Stream } from "@most/types"
// import { O } from "../core/common.js"
// import { match } from "./resolveUrl.js"
// import { expect, type Suite } from "cynic"

// export default <Suite>{
//   'match fragments': async () => {
//     const route = O(match('main'), match('books'), match(/\d+/))
//     const matchEvent = now(resolve(['main', 'books', '3']))

//     const frsgs = await collectOne(route(matchEvent))

//     expect(frsgs.fragments).equals(['main', 'books', /\d+/])
//   },

//   'matches remainig target url': async () => {
//     const changes = mergeArray([
//       now('main'),
//       now('main/books'),
//       now('main/books/144/chapter/3'),
//     ])

//     const mainRoute = router(changes).create('main')

//     expect((await collectOne(mainRoute.match)).fragments).equals(['main', 'books', /\d+/])
//   }
// }

// interface Prop {
//   <T, K extends keyof T>(key: K): (obj: T) => T[K]
//   <T, K extends keyof T>(key: K, obj: T): T[K]
// }

// const prop: Prop = curry2((key, obj: any) => obj[key])

// type Event<T> = { value: T, time: Time }

// const scheduler = newDefaultScheduler()

// export async function collectEvents<T>(stream: Stream<T>) {
//   const into: Event<T>[] = []
//   const s = tap(x => into.push({ time: scheduler.currentTime(), value: x }), stream)
//   await runEffects(s, scheduler)
//   return into
// }

// export async function collect<T>(stream: Stream<T>) {
//   const events = await collectEvents(stream)
//   return events.map(e => e.value)
// }

// export interface CollectNCurry {
//   <T>(n: number, stream: Stream<T>): Promise<Event<T>[]>
//   <T>(n: number): (stream: Stream<T>) => Promise<Event<T>[]>
// }

// function collectNFn<T>(n: number, stream: Stream<T>) {
//   return collectEvents<T>(take(n, stream))
// }

// export const collectN: CollectNCurry = curry2(collectNFn)

// export const collectOne = <T>(s: Stream<T>) =>
//   collectEvents(take(1, s)).then(x => x[0].value)

