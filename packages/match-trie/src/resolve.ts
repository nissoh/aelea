

import { filter, map, skipRepeatsWith, tap, skip } from '@most/core'
import { Fragment, PathEvent, Path } from './types'
import { O } from 'fufu'


export const isMatched = (frag: Fragment, path: Path) => {

  if (frag instanceof RegExp) {
    return Boolean(path?.match(frag))
  }

  return frag === path
}

export const match = (frag: Fragment) =>
  O(
    filter((path: PathEvent) => {
      return path.remaining.length > 0 && isMatched(frag, path.remaining[0])
    }),
  )



export const modelPath = (frag: Fragment) =>
  map((path: PathEvent): PathEvent => {

    return {
      target: path.target,
      remaining: [...path.remaining.slice(1)],
      fragments: [...path.fragments, frag]
    }
  })

export const skipRepeatedPath = skipRepeatsWith((from: PathEvent, to: PathEvent) => {
  return from.remaining[0] === to.remaining[0]
})