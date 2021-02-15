
import { map, startWith, take } from '@most/core'
import { $text, Behavior, component, StateBehavior, style } from '@aelea/core'
import { $column, $row, $seperator } from '../common/common'
import * as designSheet from '../common/stylesheet'
import $QuantumScroll, { ScrollResponse, ScrollSegment } from './$QuantumScroll'
import $Field from './form/$Field'
import $NumberTicker from './$NumberTicker'
import { themeAttention } from '../common/stylesheet'

const formatNumber = Intl.NumberFormat().format

export default component((
  [sampleScroll, scroll]: Behavior<ScrollSegment, ScrollSegment>,
  [sampleDelayTime, delayTime]: StateBehavior<string, number>
) => {

  const delayState = startWith(1500, delayTime)

  const dataSource = map((positionChange): ScrollResponse => {
    const totalItems = 1e5

    const segment = positionChange.to - positionChange.from
    const arr = Array(segment)
    const $items = arr.fill(undefined).map((x, i) => {
      const id = totalItems - (positionChange.to - i) + 1

      return $text('item: ' + formatNumber(id))
    })

    // delay response, should indicate with a loading
    return { $items, totalItems }
  }, scroll)

  const $scroll = $QuantumScroll({
    rowHeight: 30,
    maxContainerHeight: 300,
    dataSource
  })({ scroll: sampleScroll() })

  return [
    $column(designSheet.spacingBig)(
      $row(designSheet.spacingBig)(
        $row(designSheet.spacingSmall, designSheet.flex)(
          $text('Page: '),
          $NumberTicker({
            initial: 0,
            change: map(l => Math.floor(l.to / l.pageSize), scroll),
            decrementColor: themeAttention.negative,
            incrementColor: themeAttention.positive
          }),
        ),
        $text(map(l => ` page size: ${l.pageSize}`, scroll))
      ),

      $Field({ label: 'Delay Response(ms)', setValue: take(1, map(String, delayState)) })({
        value: sampleDelayTime(map(Number))
      }),

      $seperator,

      style({ border: `1px solid ${designSheet.theme.baseLight}`, padding: '15px' }, $scroll)

    )
  ]
})

