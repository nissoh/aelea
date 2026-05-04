import { combineMap, just, map, merge, start } from 'aelea/stream'
import type { IBehavior } from 'aelea/stream-extended'
import { $node, $text, component, style } from 'aelea/ui'
import {
  $card,
  $column,
  $Table,
  type IPageRequest,
  type ISortBy,
  spacing,
  type TablePageResponse
} from 'aelea/ui-components'

interface ITableRow {
  id: string
  random: number
}

const TOTAL_ITEMS = 250
const PAGE_SIZE = 25

const data: ITableRow[] = Array.from({ length: TOTAL_ITEMS }, (_, idx) => ({
  id: `item-#${idx + 1}`,
  random: Math.round(Math.random() * 100)
}))

const compare =
  <T extends ITableRow>(field: ISortBy<T>) =>
  (a: T, b: T) => {
    const valA = a[field.selector]
    const valB = b[field.selector]
    const dir = field.direction === 'desc' ? -1 : 1
    if (typeof valA === 'string' && typeof valB === 'string') return dir * valA.localeCompare(valB)
    return dir * (Number(valA) - Number(valB))
  }

const initialSort: ISortBy<ITableRow> = { direction: 'asc', selector: 'id' }
const initialRequest: IPageRequest = { offset: 0, pageSize: PAGE_SIZE }

export const $TableExample = component(
  (
    [scrollRequest, scrollRequestTether]: IBehavior<IPageRequest, IPageRequest>,
    [sortBy, sortByTether]: IBehavior<ISortBy<ITableRow>, ISortBy<ITableRow>>
  ) => {
    const sortedData = map(field => [...data].sort(compare(field)), merge(just(initialSort), sortBy))

    const dataSource = combineMap(
      (rows: ITableRow[], request: IPageRequest): Promise<TablePageResponse<ITableRow>> =>
        Promise.resolve({
          page: rows.slice(request.offset, request.offset + request.pageSize),
          offset: request.offset,
          pageSize: request.pageSize
        }),
      sortedData,
      start(initialRequest, scrollRequest)
    )

    return [
      $card(
        $Table({
          dataSource,
          scrollConfig: { $container: $column(spacing.default, style({ height: '400px', overflow: 'auto' })) },
          sortChange: just(initialSort),
          columns: [
            {
              $head: $text('ID'),
              $bodyCallback: map(row => $node($text(row.id))),
              sortBy: 'id'
            },
            {
              $head: $text('Random'),
              $bodyCallback: map(row => $node($text(row.random.toString()))),
              sortBy: 'random'
            },
            {
              $head: $text('Reversed ID'),
              $bodyCallback: map(row => $node($text([...row.id].reverse().join(''))))
            }
          ]
        })({
          scrollRequest: scrollRequestTether(),
          sortBy: sortByTether()
        })
      )
    ]
  }
)
