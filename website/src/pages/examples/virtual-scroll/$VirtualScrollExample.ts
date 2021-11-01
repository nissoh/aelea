
import { Behavior } from '@aelea/core'
import { $text, component, style } from '@aelea/dom'
import { $card, $column, $row, $seperator, $TextField, $VirtualScroll, layoutSheet, ScrollRequest, ScrollResponse } from '@aelea/ui-components'
import { pallete } from '@aelea/ui-components-theme'
import { at, debounce, empty, join, map, merge, now, snapshot, startWith, switchLatest } from '@most/core'
import { Stream } from '@most/types'


function filterArrayByText(array: string[], filter: string) {
  const filterLowercase = filter.toLocaleLowerCase()
  return array.filter(id =>
    id.indexOf(filterLowercase) > -1
  )
}

const $label = (label: string, value: Stream<string> | string) => $row(layoutSheet.spacingSmall)(
  $text(style({ color: pallete.foreground }))(label),
  $text(value)
)

export const $VirtualScrollExample = component((
  [scrollRequest, scrollRequestTether]: Behavior<ScrollRequest, ScrollRequest>,
  [delayResponse, delayResponseTether]: Behavior<string, number>,
  [filter, filterTether]: Behavior<string, string>,
) => {

  const PAGE_SIZE = 25
  const TOTAL_ITEMS = 1000

  const formatNumber = Intl.NumberFormat().format
  const initialDelayResponse = now(1600)
  const delayWithInitial = merge(initialDelayResponse, delayResponse)

  let i = 0
  const $item = $text(style({ padding: '3px 10px' }))

  const stubbedData = Array(TOTAL_ITEMS).fill(null).map(() =>
    `item: ${Math.random().toString(36).substring(7)} ${formatNumber(++i)}`
  )

  
  const dataSourceFilter = (filter: string) => join(
    snapshot((delay, requestNumber): Stream<ScrollResponse> => {
      const pageStart = requestNumber * PAGE_SIZE
      const pageEnd = pageStart + PAGE_SIZE
      const filteredItems = filterArrayByText(stubbedData, filter)
      const $items = filteredItems.slice(pageStart, pageEnd).map(id => {
        return $item(id)
      })

      return at(delay, { $items: $items, offset: 0, pageSize: PAGE_SIZE })
    }, delayWithInitial, scrollRequest)
  )



  const filterText = startWith('', filter)
  const debouncedFilterText = debounce(300, filterText)

  return [
    $column(layoutSheet.spacingBig)(
      $text(`High performance dynamically loaded list based on Intersection Observer Web API. this example shows a very common pagination and REST like fetching asynchnously more pages`),
      $row(layoutSheet.spacingBig)(

        $label('Page: ', map(l => String(l), scrollRequest)),
        $label(`Page Size:`, String(PAGE_SIZE)),
        $label(`Total Items:`, String(TOTAL_ITEMS)),
        
      ),

      $row(layoutSheet.spacingBig)(
        $TextField({
          label: 'Filter',
          value: empty(),
          hint: 'Remove any items that does not match filter and debounce changes by 300ms to prevert spamming',
          containerOp: layoutSheet.flex
        })({
          change: filterTether()
        }),
        $TextField({
          label: 'Delay Response(ms)',
          value: initialDelayResponse,
          hint: 'Emulate the duration of a datasource response, show a stubbed $node instead',
          containerOp: layoutSheet.flex
        })({
          change: delayResponseTether(
            map(Number)
          )
        }),
      ),

      $seperator,

      $card(style({ padding: 0 }))(
        switchLatest(
          map(searchText =>
            $VirtualScroll({
              dataSource: dataSourceFilter(searchText),
              containerOps: style({ padding: '8px', maxHeight: '400px' })
            })({
              scrollIndex: scrollRequestTether(),
            })
          , debouncedFilterText)
        )
      )

    )
  ]
})

