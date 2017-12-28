

// import { curry2 } from '@most/prelude'
import { Stream } from '@most/types'
import { filter, map } from '@most/core'
import { Fragment, PathEvent, Paths } from './types'



export function resolve (frag: Fragment, stream: Stream<PathEvent>): Stream<PathEvent> {
  const isSring = typeof (frag) === 'string'

  const filterStream = filter(({ targetRemaining }) => {
    const fstFrag = targetRemaining[0]
    return isSring ? frag === fstFrag : !!fstFrag.match(frag)
  }, stream)

  return map(({ targetfragments, targetRemaining, fragments, resolvedFragments }) =>
    ({
      targetfragments,
      targetRemaining: targetRemaining.slice(1),
      fragments: [...fragments, frag],
      resolvedFragments: [...resolvedFragments, targetfragments[fragments.length]]
    }), filterStream)
}


export const createPathState = map<Paths, PathEvent>(targetfragments =>
  ({ targetfragments, targetRemaining: targetfragments, fragments: [], resolvedFragments: [] })
)

