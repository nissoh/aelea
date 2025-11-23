import {
  constant,
  debounce,
  empty,
  type IStream,
  join,
  just,
  map,
  merge,
  sampleMap,
  start,
  switchLatest,
  wait
} from 'aelea/stream'
import type { IBehavior } from 'aelea/stream-extended'
import { $node, $p, $text, component, style } from 'aelea/ui'
import type { ScrollRequest, ScrollResponse } from 'aelea/ui-components'
import { $card, $column, $row, $seperator, $TextField, $VirtualScroll, spacing } from 'aelea/ui-components'
import { pallete } from 'aelea/ui-components-theme'

function filterArrayByText(array: string[], filter: string) {
  const filterLowercase = filter.toLocaleLowerCase()
  return array.filter(id => id.indexOf(filterLowercase) > -1)
}

const $label = (label: string, value: IStream<string> | string) =>
  $row(spacing.small)($node(style({ color: pallete.foreground }))($text(label)), $text(value))

export const $VirtualScrollExample = component(
  (
    [scrollRequest, scrollRequestTether]: IBehavior<ScrollRequest, ScrollRequest>,
    [delayResponse, delayResponseTether]: IBehavior<string, number>,
    [filter, filterTether]: IBehavior<string, string>
  ) => {
    const PAGE_SIZE = 25
    const TOTAL_ITEMS = 1000

    const formatNumber = Intl.NumberFormat().format
    const initialDelayResponse = just(1600)
    const delayWithInitial = merge(initialDelayResponse, delayResponse)

    let i = 0
    const $item = $p(style({ padding: '3px 10px' }))

    const stubbedData = Array(TOTAL_ITEMS)
      .fill(null)
      .map(() => `item: ${Math.random().toString(36).substring(7)} ${formatNumber(++i)}`)

    const dataSourceFilter = (filter: string) =>
      join(
        sampleMap(
          (delay, requestNumber): IStream<ScrollResponse> => {
            const pageStart = requestNumber * PAGE_SIZE
            const pageEnd = pageStart + PAGE_SIZE
            const filteredItems = filterArrayByText(stubbedData, filter)
            const $items = filteredItems.slice(pageStart, pageEnd).map(id => {
              return $item($text(id))
            })

            return constant({ $items: $items, offset: 0, pageSize: PAGE_SIZE }, wait(delay))
          },
          delayWithInitial,
          scrollRequest
        )
      )

    const filterText = start('', filter)
    const debouncedFilterText = debounce(300, filterText)

    return [
      $column(spacing.big)(
        $text(
          'High performance dynamically loaded list based on Intersection Observer Web API. This example shows a common paginated, REST-like fetch that loads pages asynchronously.'
        ),
        $row(spacing.big)(
          $label(
            'Page: ',
            map(l => String(l), scrollRequest)
          ),
          $label('Page Size:', String(PAGE_SIZE)),
          $label('Total Items:', String(TOTAL_ITEMS))
        ),

        $row(spacing.big)(
          $TextField({
            label: 'Filter',
            value: empty,
            hint: 'Remove items that do not match the filter; debounce changes by 300ms to prevent spamming.',
            containerOp: style({ flex: 1 })
          })({
            change: filterTether()
          }),
          $TextField({
            label: 'Delay Response(ms)',
            value: initialDelayResponse,
            hint: 'Emulate datasource latency; shows stubbed items while waiting.',
            containerOp: style({ flex: 1 })
          })({
            change: delayResponseTether(map(Number))
          })
        ),

        $seperator,

        $card(style({ padding: 0 }))(
          switchLatest(
            map(
              searchText =>
                $VirtualScroll({
                  dataSource: dataSourceFilter(searchText),
                  containerOps: style({ padding: '8px', maxHeight: '400px' })
                })({
                  scrollIndex: scrollRequestTether()
                }),
              debouncedFilterText
            )
          )
        )
      )
    ]
  }
)
