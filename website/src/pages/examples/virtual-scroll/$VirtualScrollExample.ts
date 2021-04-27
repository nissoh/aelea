
import { $text, Behavior, component, style } from '@aelea/core'
import { $card, $column, $row, $seperator, $TextField, $VirtualScroll, layoutSheet, ScrollRequest, ScrollResponse } from '@aelea/ui-components'
import { pallete } from '@aelea/ui-components-theme'
import { at, join, map, merge, now, snapshot } from '@most/core'
import { Stream } from '@most/types'


export const $VirtualScrollExample = component((
  [sampleScrollRequest, scrollRequest]: Behavior<ScrollRequest, ScrollRequest>,
  [sampleDelayResponse, delayResponse]: Behavior<string, number>,
) => {

  const formatNumber = Intl.NumberFormat().format
  const initialDelayResponse = now(1500)
  const delayWithInitial = merge(initialDelayResponse, delayResponse)

  let i = 0
  const newLocal_1 = $text(style({ padding: '3px 10px' }))

  
  const dataSource = join(
    snapshot((delay, requestNumber): Stream<ScrollResponse> => {
      const $items = Array(100).fill(null).map(() => {
        return newLocal_1('item: ' + formatNumber(++i))
      })

      return at(delay, { $items, totalItems: 10000 })
    }, delayWithInitial, scrollRequest)
  )



  return [
    $column(layoutSheet.spacingBig)(
      $text('High performance dynamically loaded list based on scroll position and computed container height'),
      $row(layoutSheet.spacingBig)(
        $row(layoutSheet.spacingSmall, layoutSheet.flex)(
          $text(style({ color: pallete.foreground }))('Page: '),
          // $NumberTicker({
          //   value$: map(l => Math.floor(l.to / l.pageSize), scrollRequest),
          //   decrementColor: pallete.negative,
          //   incrementColor: pallete.positive
          // }),
        ),
        $row(layoutSheet.spacingSmall)(
          $text(style({ color: pallete.foreground }))(`page size: `),
          $text(
            // map(l => String(l.pageSize), scrollRequest)
          )
        )
      ),

      $row(layoutSheet.spacingBig)(
        $TextField({
          label: 'Delay Response(ms)',
          value: initialDelayResponse,
          hint: 'Emulate the duration of a datasource response, show a stubbed $node instead'
        })({
          change: sampleDelayResponse(
            map(Number)
          )
        }),
      ),

      $seperator,

      $card(style({ padding: 0 }))(
        $VirtualScroll({
          dataSource,
          containerStyle: { padding: '8px', maxHeight: '400px' }
        })({
          scrollRequest: sampleScrollRequest()
        })
      )

    )
  ]
})

