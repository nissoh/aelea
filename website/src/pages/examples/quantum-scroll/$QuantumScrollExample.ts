import { debounce, empty, type IStream, just, map, merge, sampleMap, start, switchLatest } from 'aelea/stream'
import type { IBehavior } from 'aelea/stream-extended'
import { $element, $node, $text, component, style } from 'aelea/ui'
import {
  $card,
  $column,
  $defaultTextFieldContainer,
  $QuantumScroll,
  $row,
  $separator,
  $TextField,
  type IPageRequest,
  type IQuantumScrollPage,
  spacing
} from 'aelea/ui-components'
import { palette } from 'aelea/ui-components-theme'

const PAGE_SIZE = 25
const TOTAL_ITEMS = 1000

const $label = (label: string, value: IStream<string> | string) =>
  $row(spacing.small)($node(style({ color: palette.foreground }))($text(label)), $text(value))

function filterArrayByText(array: string[], filter: string) {
  const filterLowercase = filter.toLocaleLowerCase()
  return array.filter(id => id.indexOf(filterLowercase) > -1)
}

export const $QuantumScrollExample = component(
  (
    [scrollRequest, scrollRequestTether]: IBehavior<IPageRequest, IPageRequest>,
    [delayResponse, delayResponseTether]: IBehavior<string, number>,
    [filter, filterTether]: IBehavior<string, string>
  ) => {
    const formatNumber = Intl.NumberFormat().format
    const initialDelayResponse = just(1600)
    const delayWithInitial = merge(initialDelayResponse, delayResponse)

    let i = 0
    const $item = $element('p')(style({ padding: '3px 10px' }))

    const stubbedData = Array(TOTAL_ITEMS)
      .fill(null)
      .map(() => `item: ${Math.random().toString(36).substring(7)} ${formatNumber(++i)}`)

    const initialRequest: IPageRequest = { offset: 0, pageSize: PAGE_SIZE }
    const requestWithInitial = start(initialRequest, scrollRequest)

    const dataSourceFilter = (filter: string): IStream<Promise<IQuantumScrollPage>> =>
      sampleMap(
        (delay, request): Promise<IQuantumScrollPage> => {
          const filteredItems = filterArrayByText(stubbedData, filter)
          const slice = filteredItems.slice(request.offset, request.offset + request.pageSize)
          const $items = slice.map(id => $item($text(id)))
          const page: IQuantumScrollPage = { $items, offset: request.offset, pageSize: request.pageSize }
          return new Promise(resolve => setTimeout(() => resolve(page), delay))
        },
        delayWithInitial,
        requestWithInitial
      )

    const filterText = start('', filter)
    const debouncedFilterText = debounce(300, filterText)
    const currentPageLabel = map(req => String(Math.floor(req.offset / req.pageSize) + 1), requestWithInitial)

    return [
      $column(spacing.big)(
        $text(
          'High performance dynamically loaded list based on Intersection Observer Web API. This example shows a common paginated, REST-like fetch that loads pages asynchronously.'
        ),
        $row(spacing.big)(
          $label('Page: ', currentPageLabel),
          $label('Page Size:', String(PAGE_SIZE)),
          $label('Total Items:', String(TOTAL_ITEMS))
        ),

        $row(spacing.big)(
          $TextField({
            label: 'Filter',
            value: empty,
            hint: 'Remove items that do not match the filter; debounce changes by 300ms to prevent spamming.',
            $container: $defaultTextFieldContainer(style({ flex: 1 }))
          })({
            change: filterTether()
          }),
          $TextField({
            label: 'Delay Response(ms)',
            value: initialDelayResponse,
            hint: 'Emulate datasource latency; shows stubbed items while waiting.',
            $container: $defaultTextFieldContainer(style({ flex: 1 }))
          })({
            change: delayResponseTether(map(Number))
          })
        ),

        $separator,

        $card(style({ padding: 0 }))(
          switchLatest(
            map(
              searchText =>
                $QuantumScroll({
                  dataSource: dataSourceFilter(searchText),
                  $container: $column(spacing.default, style({ padding: '8px', maxHeight: '400px', overflow: 'auto' }))
                })({
                  scrollRequest: scrollRequestTether()
                }),
              debouncedFilterText
            )
          )
        )
      )
    ]
  }
)
