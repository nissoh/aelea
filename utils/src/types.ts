import { Stream } from "@most/types"

export type Op<T, R> = (o: Stream<T>) => Stream<R>
