import { filter } from '@most/core'
import type { Stream } from '@most/types'

export const filterNull = <T>(prov: Stream<T | null>) => filter((ev): ev is T => ev !== null, prov)
