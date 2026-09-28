import {
  delay,
  filter,
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
import { state } from '../../stream-extended/index.js'
import type { INodeCompose, IStyleCSS } from '../../ui/index.js'
import { $node, $text, style, styleBehavior } from '../../ui/index.js'
import { palette } from '../../ui-components-theme/index.js'
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

export interface I$NumberTicker {
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
}: I$NumberTicker) => {
  const count = op(
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
    state()
  )

  const decayStyle: IStream<IStyleCSS> = delay(1000, just({}))

  const $slotAt = (slot: number) =>
    $slot(
      styleBehavior(
        op(
          count,
          filter(tick => tick.dir !== null && tick.affectedUpTo >= slot),
          map(tick => start({ color: tick.dir === Direction.INCREMENT ? incrementColor : decrementColor }, decayStyle)),
          switchLatest
        )
      )
    )(
      $text(
        op(
          count,
          map(tick => charAt(tick.changeStr, slot)),
          skipRepeats
        )
      )
    )

  const $slots = Array.from({ length: slots }, (_, slot) => $slotAt(slot)).reverse()

  return $container(...$slots)
}
