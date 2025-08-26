import { reduce } from '../../stream/combinator/reduce.js'
import {
  at,
  filterNull,
  type IStream,
  map,
  now,
  op,
  skipRepeats,
  skipRepeatsWith,
  startWith,
  switchLatest
} from '../../stream/index.js'
import { multicast } from '../../stream-extended/index.js'
import type { IStyleCSS } from '../../ui/combinator/style.js'
import { $node, $text, style, styleBehavior } from '../../ui/index.js'
import { pallete } from '../../ui-components-theme/globalState.js'

export const sumFromZeroOp = reduce((current: number, x: number) => current + x, 0)

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

export interface NumberConfig {
  value: IStream<number>
  incrementColor?: string
  decrementColor?: string
  textStyle?: IStyleCSS
  slots?: number // can be deprecated
  parser?: (value: number) => string
}
export const $NumberTicker = ({
  value,
  incrementColor = pallete.positive,
  decrementColor = pallete.negative,
  textStyle = {},
  slots = 10,
  parser = (n: number) => n.toLocaleString()
}: NumberConfig) => {
  const incrementMulticast = op(
    value,
    reduce(
      (seed, change): CountState => {
        const changeStr = parser(change)

        if (seed === null) {
          return { change, dir: null, pos: changeStr.length, changeStr }
        }

        const dir = change > seed.change ? Direction.INCREMENT : Direction.DECREMENT
        const currentStr = parser(seed.change)

        // Find the position where strings differ
        let pos = 0
        const minLen = Math.min(currentStr.length, changeStr.length)
        while (pos < minLen && currentStr[pos] === changeStr[pos]) {
          pos++
        }

        return { change, dir, pos, changeStr }
      },
      null as CountState | null
    ),
    filterNull,
    skipRepeats,
    multicast
  )

  const styledTextTransition = style({
    fontVariantNumeric: 'tabular-nums',
    transition: 'ease-out .25s color',
    ...textStyle
  })

  return $node(
    ...Array(slots)
      .fill(undefined)
      .map((_, slot) => {
        return $node(
          styledTextTransition,
          styleBehavior(
            op(
              incrementMulticast,
              skipRepeatsWith((x, y) => x.changeStr[slot] === y.changeStr[slot] && slot < y.pos),
              map(state => {
                if (!state) return now({})

                const { pos, dir } = state
                const resetStyle = now({})
                const decayColor = at(1000, {})

                // If this slot is before the change position, just reset
                if (slot < pos) {
                  return resetStyle
                }

                // If no direction (initial state), return reset
                if (dir === null || dir === undefined) {
                  return resetStyle
                }

                // Apply color and then decay
                const color = dir === Direction.INCREMENT ? incrementColor : decrementColor
                return startWith({ color }, decayColor)
              }),
              switchLatest
            )
          )
        )(
          $text(
            op(
              incrementMulticast,
              map(state => state?.changeStr[slot] ?? ''),
              skipRepeats
            )
          )
        )
      })
  )
}
