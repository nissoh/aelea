import { at, map, merge, multicast, now, scan, skip, skipRepeats, skipRepeatsWith, switchLatest } from '@most/core'
import { $node, $text, O, style, styleBehavior, StyleCSS } from '@aelea/core'
import { Stream } from '@most/types'

export const sumFromZeroOp = scan((current: number, x: number) => current + x, 0)

export interface NumberConfig {
  value$: Stream<number>,
  incrementColor: string,
  decrementColor: string,
  textStyle?: StyleCSS,
  slots?: number // can be deprecated
}

enum Direction {
  INCREMENT,
  DECREMENT
}

type CountState = {
  dir: Direction | null
  change: number
  pos: number
  changeStr: string
}



function getDetlaSlotIdex(current: string, change: string, i: number): number {
  if (current[i] !== change[i] || i > change.length)
    return i

  return getDetlaSlotIdex(current, change, i + 1)
}

export const $NumberTicker = ({ value$, incrementColor, decrementColor, textStyle = {}, slots = 10 }: NumberConfig) => {

  const uniqueValues$ = skipRepeats(value$)
  const incrementMulticast = O(
    scan((seed: CountState | null, change: number): CountState => {

      const changeStr = change.toLocaleString()

      if (seed === null) {
        return { change, dir: null, pos: changeStr.length, changeStr }
      }

      const dir = change > seed.change ? Direction.INCREMENT : Direction.DECREMENT
      const currentStr = seed.change.toLocaleString()
      const isWholeNumber = changeStr.split('.').length === 1

      // TODO handle fractions
      const pos = isWholeNumber && changeStr.length > currentStr.length ? 0 : getDetlaSlotIdex(currentStr, changeStr, 0)

      return { change, dir, pos, changeStr }
    }, null),
    skip(1), // skips inital null that scans emit - preventing count from getting an inital color
    multicast,
  )(uniqueValues$)

  const dirStyleMap = {
    [Direction.INCREMENT]: { color: incrementColor },
    [Direction.DECREMENT]: { color: decrementColor },
  }


  return $node(
    ...Array(slots).fill(undefined).map((_, slot) =>

      $text(
        style({ transition: 'ease-out .25s color', ...textStyle }),
        styleBehavior(
          switchLatest(
            O(
              skipRepeatsWith((x: CountState, y: CountState) => x.changeStr[slot] === y.changeStr[slot] && slot < y.pos),
              map(({ pos, dir }: CountState) => {

                const decayColor = at(1000, {})
                if (slot < pos) {
                  return decayColor
                }

                return merge(
                  now(dirStyleMap[dir!]),
                  decayColor
                )
              })
            )(incrementMulticast)
          )
        )
      )(
        O(map(({ changeStr }: CountState) => changeStr[slot] ?? ''), skipRepeats)(incrementMulticast)
      )

    )
  )
}

