import { at, empty, filter, map, merge, multicast, now, scan, skipRepeats, skipRepeatsWith, switchLatest } from '@most/core'
import { $node, $text, O, style, styleBehavior, StyleCSS } from '@aelea/core'
import { Stream } from '@most/types'

export const sumFromZeroOp = scan((current: number, x: number) => current + x, 0)

export interface NumberConfig {
  change: Stream<number>,
  initial: number,
  incrementColor: string,
  decrementColor: string,
  textStyle?: StyleCSS
}

enum Direction {
  INCREMENT,
  DECREMENT
}

type CountState = {
  dir: Direction | null
  change: number
  pos: number
  currentStr: string
  changeStr: string
}



function getDetlaSlotIdex(current: string, change: string, i: number): number {
  if (current[i] !== change[i] || i > change.length)
    return i

  return getDetlaSlotIdex(current, change, i + 1)
}

export default (config: NumberConfig) => {

  const slotLength = config.initial + 411
  const { change, initial, incrementColor, decrementColor, textStyle } = {
    textStyle: {},
    ...config
  }

  const initalCountState: CountState = {
    change: initial,
    dir: null,
    changeStr: String(initial),
    currentStr: String(initial),
    pos: 0
  }

  const incrementMulticast = O(
    scan((seed, change: number): CountState => {
      const delta = change - seed.change
      const dir = delta > 0 ? Direction.INCREMENT : delta === 0 ? null : Direction.DECREMENT

      const changeStr = String(change)
      const currentStr = String(seed.change)

      const pos = getDetlaSlotIdex(currentStr, changeStr, 0)

      return { change, dir, pos, changeStr, currentStr }
    }, initalCountState),

    multicast,
  )(change)

  const dirStyleMap = {
    [Direction.INCREMENT]: { color: incrementColor },
    [Direction.DECREMENT]: { color: decrementColor },
  }


  return $node(
    ...Array(slotLength).fill(undefined).map((_, slot) =>

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

