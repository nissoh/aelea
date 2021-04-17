
import { $text, Behavior, component, style } from '@aelea/core'
import { $column, $NumberTicker, $QuantumScroll, $row, $seperator, $TextField, layoutSheet, ScrollSegment } from '@aelea/ui-components'
import { pallete } from '@aelea/ui-components-theme'
import { at, debounce, map, merge, now, snapshot, switchLatest } from '@most/core'



export default component((
  [sampleScroll, scroll]: Behavior<ScrollSegment, ScrollSegment>,
  [sampleDelayResponse, delayResponse]: Behavior<string, number>,
  [sampleDebounceRequest, debounceRequest]: Behavior<string, number>,
) => {

  const formatNumber = Intl.NumberFormat().format
  const initialDebounceRequestChange = now(1000)
  const initialDelayResponse = now(500)

  const dataSource = switchLatest(
    map((debounceDuration: number) => {
      const dd = debounce(debounceDuration, scroll)

      return switchLatest(
        snapshot((delay: number, positionChange) => {
          const totalItems = 1e6

          const arr = Array(positionChange.delta).fill(null)
          const $items = arr.map((x, i) => {
            const to = Math.min(positionChange.to, totalItems)
            const id = totalItems - (to - i) + 1

            return $text(style({ padding: '3px 10px' }))('item: ' + formatNumber(id))
          })

          return at(delay, { $items, totalItems })
        }, merge(initialDelayResponse, delayResponse), dd)
      )
    }, merge(initialDebounceRequestChange, debounceRequest))
  )


  return [
    $column(layoutSheet.spacingBig)(
      $text('High performance dynamically loaded list based on scroll position and computed container height'),
      $row(layoutSheet.spacingBig)(
        $row(layoutSheet.spacingSmall, layoutSheet.flex)(
          $text(style({ color: pallete.description }))('Page: '),
          $NumberTicker({
            value$: map(l => Math.floor(l.to / l.pageSize), scroll),
            decrementColor: pallete.negative,
            incrementColor: pallete.positive
          }),
        ),
        $row(layoutSheet.spacingSmall)(
          $text(style({ color: pallete.description }))(`page size: `),
          $text(
            map(l => String(l.pageSize), scroll)
          )
        )
      ),

      $row(layoutSheet.spacingBig)(
        $TextField({
          label: 'Debounce Request(ms)',
          value: initialDebounceRequestChange,
          hint: 'prevent bursts of page requests to a datasource during scroll',
          validation: map(value => isFinite(Number(value)) ? null : 'Field has to contain numbers only')
        })({
          change: sampleDebounceRequest(
            map(Number)
          )
        }),
        $TextField({
          label: 'Delay Response(ms)',
          value: initialDelayResponse,
          hint: 'Emulate the duration of our datasource response, show a stubbed $node instead'
        })({
          change: sampleDelayResponse(
            map(Number)
          )
        }),
      ),

      $seperator,

      $QuantumScroll({
        rowHeight: 31,
        dataSource,
        containerStyle: { border: `1px solid ${pallete.horizon}`, height: '400px' }
      })({
        requestSource: sampleScroll()
      })

    )
  ]
})

