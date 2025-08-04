import type { IStyleCSS } from '../../core/combinator/style.js'
import { $node, $text, style, styleBehavior } from '../../core/index.js'
import {
  aggregate,
  at,
  empty,
  type IStream,
  map,
  merge,
  multicast,
  now,
  op,
  skip,
  skipRepeats,
  skipRepeatsWith,
  switchLatest
} from '../../stream/index.js'

export const sumFromZeroOp = aggregate((current: number, x: number) => current + x, 0)

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

interface NumberConfig {
  value$: IStream<number>
  incrementColor: string
  decrementColor: string
  textStyle?: IStyleCSS
  slots?: number // can be deprecated
}
export const $NumberTicker = ({ value$, incrementColor, decrementColor, textStyle = {}, slots = 10 }: NumberConfig) => {
  const incrementMulticast = op(
    skipRepeats(value$),
    aggregate((seed: CountState | null, change: number): CountState => {
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
    skip(1), // skips initial null that aggregate emits - preventing count from getting an initial color
    multicast
  )

  const dirStyleMap = {
    [Direction.INCREMENT]: { color: incrementColor },
    [Direction.DECREMENT]: { color: decrementColor }
  }

  const styledTextTransition = style({ transition: 'ease-out .25s color', ...textStyle })

  return $node(
    ...Array(slots)
      .fill(undefined)
      .map((_, slot) => {
        const $label = op(
          incrementMulticast,
          map(({ changeStr }: CountState) => changeStr[slot] ?? ''),
          skipRepeats,
          $text
        )

        return $node(
          styledTextTransition,
          styleBehavior(
            op(
              incrementMulticast,
              skipRepeatsWith(
                (x: CountState, y: CountState) => x.changeStr[slot] === y.changeStr[slot] && slot < y.pos
              ),
              map(({ pos, dir }: CountState) => {
                const decayColor = at(1000, {})
                if (slot < pos) {
                  return decayColor
                }

                return merge(dir ? now(dirStyleMap[dir]) : empty, decayColor)
              }),
              switchLatest
            )
          )
        )($label)
      })
  )
}

function getDetlaSlotIdex(current: string, change: string, i: number): number {
  if (current[i] !== change[i] || i > change.length) return i

  return getDetlaSlotIdex(current, change, i + 1)
}
