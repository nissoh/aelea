
import { map, take } from '@most/core'
import { $text, Behavior, component, state, StateBehavior, style } from '@aelea/core'
import { $column, $seperator } from '../common/common'
import * as designSheet from '../common/stylesheet'
import $QuantumScroll, { ScrollResponse, ScrollSegment } from './$QuantumScroll'
import $Field from './form/$Field'

const formatNumber = Intl.NumberFormat().format

export default component((
  [sampleScroll, scroll]: Behavior<ScrollSegment, ScrollSegment>
) => {

  const [sampleDelayTime, delayTime]: StateBehavior<string, number> = state(1500)

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
      $text(map(l => `From: ${formatNumber(l.from)} To: ${formatNumber(l.to)} page size: ${l.pageSize}`, scroll)),

      $Field({ label: 'Delay Response(ms)', setValue: take(1, map(String, delayTime)) })({
        value: sampleDelayTime(map(Number))
      }),

      $seperator,

      style({ border: `1px solid ${designSheet.theme.baseLight}`, padding: '15px' }, $scroll)

    )
  ]
})

