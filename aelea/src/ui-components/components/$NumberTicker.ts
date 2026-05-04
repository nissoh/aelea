import {
  delay,
  filterNull,
  type IStream,
  just,
  map,
  op,
  reduce,
  skipRepeats,
  skipRepeatsWith,
  start,
  switchLatest
} from '../../stream/index.js'
import { multicast } from '../../stream-extended/index.js'
import { palette } from '../../ui-components-theme/index.js'
import type { INodeCompose, IStyleCSS } from '../../ui-renderer-dom/index.js'
import { $node, $text, style, styleBehavior } from '../../ui-renderer-dom/index.js'
import { $row } from '../elements/$elements.js'

export const sumFromZeroOp = reduce((current: number, x: number) => current + x, 0)

enum Direction {
  INCREMENT,
  DECREMENT
}

interface CountState {
  dir: Direction | null
  change: number
  changeStr: string
  affectedUpTo: number
}

export interface NumberConfig {
  value: IStream<number>
  incrementColor?: string
  decrementColor?: string
  slots?: number
  parser?: (value: number) => string
  $container?: INodeCompose
  $slot?: INodeCompose
}

export const $defaultNumberTickerContainer = $row(style({ justifyContent: 'flex-end' }))

export const $defaultNumberTickerSlot = $node(
  style({
    fontVariantNumeric: 'tabular-nums',
    transition: 'ease-out .25s color'
  })
)

const charAt = (str: string, slot: number): string => str[str.length - 1 - slot] ?? ''

export const $NumberTicker = ({
  value,
  incrementColor = palette.positive,
  decrementColor = palette.negative,
  slots = 10,
  parser = (n: number) => n.toLocaleString(),
  $container = $defaultNumberTickerContainer,
  $slot = $defaultNumberTickerSlot
}: NumberConfig) => {
  const incrementMulticast = op(
    value,
    reduce(
      (seed: CountState | null, change: number): CountState => {
        const changeStr = parser(change)
        if (seed === null) return { dir: null, change, changeStr, affectedUpTo: -1 }
        const dir = change > seed.change ? Direction.INCREMENT : Direction.DECREMENT
        const prevStr = seed.changeStr
        const maxLen = Math.max(changeStr.length, prevStr.length)
        let affectedUpTo = -1
        for (let i = 0; i < maxLen; i++) {
          if (charAt(changeStr, i) !== charAt(prevStr, i)) affectedUpTo = i
        }
        return { dir, change, changeStr, affectedUpTo }
      },
      null as CountState | null
    ),
    filterNull,
    skipRepeatsWith((a, b) => a.change === b.change),
    multicast
  )

  const resetStyle: IStream<IStyleCSS> = just({})
  const decayStyle: IStream<IStyleCSS> = delay(1000, resetStyle)

  const $slotAt = (slot: number) =>
    $slot(
      styleBehavior(
        op(
          incrementMulticast,
          skipRepeatsWith((a, b) => a.affectedUpTo < slot && b.affectedUpTo < slot),
          map(state => {
            if (state.dir === null || state.affectedUpTo < slot) return resetStyle
            const color = state.dir === Direction.INCREMENT ? incrementColor : decrementColor
            return start({ color }, decayStyle)
          }),
          switchLatest
        )
      )
    )(
      $text(
        op(
          incrementMulticast,
          map(state => charAt(state.changeStr, slot)),
          skipRepeats
        )
      )
    )

  const $slots = Array.from({ length: slots }, (_, slot) => $slotAt(slot)).reverse()

  return $container(...$slots)
}
