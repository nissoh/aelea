
import { $text, Behavior, component, StateBehavior, style } from '@aelea/core'
import { $column, $QuantumScroll, $row, $seperator, $TextField, layoutSheet, ScrollSegment } from '@aelea/ui-components'
import { theme } from '@aelea/ui-components-theme'
import { at, map, now, snapshot, switchLatest } from '@most/core'
import $NumberTicker from '../../../components/$NumberTicker'

const formatNumber = Intl.NumberFormat().format


export default component((
  [sampleScroll, scroll]: Behavior<ScrollSegment, ScrollSegment>,
  [sampleDelayReuestChange, delayReuestChange]: StateBehavior<string, number>,
  [sampleDebounceRequestChange, debounceRequestChange]: StateBehavior<string, number>,
) => {

  const dataSource = switchLatest(
    snapshot((delay, positionChange) => {
      const totalItems = 1e6

      const arr = Array(positionChange.delta)
      const $items = arr.fill(undefined).map((x, i) => {
        const id = totalItems - (positionChange.to - i) + 1

        return $text('item: ' + formatNumber(id))
      }, delayReuestChange)

      return at(delay, { $items, totalItems })
    }, delayReuestChange, scroll)
  )


  return [
    $column(layoutSheet.spacingBig)(
      $text('High performance dynamically loaded list based on scroll position and computed container height'),
      $row(layoutSheet.spacingBig)(
        $row(layoutSheet.spacingSmall, layoutSheet.flex)(
          $text(style({ color: theme.system }))('Page: '),
          $NumberTicker({
            value$: map(l => Math.floor(l.to / l.pageSize), scroll),
            decrementColor: theme.negative,
            incrementColor: theme.positive
          }),
        ),
        $row(layoutSheet.spacingSmall)(
          $text(style({ color: theme.system }))(`page size: `),
          $text(
            map(l => String(l.pageSize), scroll)
          )
        )
      ),

      $row(layoutSheet.spacingBig)(
        $TextField({
          label: 'Debounce Request(ms)',
          value: now(1000),
          hint: 'prevent bursts of page requests to a datasource during scroll'
        })({
          value: sampleDebounceRequestChange(
            map(Number)
          )
        }),
        $TextField({
          label: 'Delay Response(ms)',
          value: now(500),
          hint: 'Emulate the duration of our datasource response, show a stubbed $node instead'
        })({
          value: sampleDelayReuestChange(
            map(Number)
          )
        }),
      ),

      $seperator,

      switchLatest(
        map(debounceReuqest => {
          return $QuantumScroll({
            rowHeight: 30,
            maxContainerHeight: 300,
            dataSource,
            debounceReuqest,
            containerStyle: { border: `1px solid ${theme.baseLight}`, padding: '15px' }
          })({ scroll: sampleScroll() })
        }, debounceRequestChange)
      )

    )
  ]
})

