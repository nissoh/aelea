import { combineMap, just, map, merge } from 'aelea/stream'
import type { IBehavior } from 'aelea/stream-extended'
import { $node, $text, component, style } from 'aelea/ui'
import { $card, $Table, type ISortBy, type ScrollRequest, type TablePageResponse } from 'aelea/ui-components'

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
    const valA = a[field.name]
    const valB = b[field.name]
    const dir = field.direction === 'desc' ? -1 : 1
    if (typeof valA === 'string' && typeof valB === 'string') return dir * valA.localeCompare(valB)
    return dir * (Number(valA) - Number(valB))
  }

const initialSort: ISortBy<ITableRow> = { direction: 'asc', name: 'id' }

export const $TableExample = component(
  (
    [requestList, requestListTether]: IBehavior<ScrollRequest, ScrollRequest>,
    [sortBy, sortByTether]: IBehavior<ISortBy<ITableRow>, ISortBy<ITableRow>>
  ) => {
    // Sorted snapshot: rebuilt only when sort changes, never on scroll.
    const sortedData = map(field => [...data].sort(compare(field)), merge(just(initialSort), sortBy))

    // Page slice: emits whenever scroll advances OR sort rebuilds the snapshot.
    const dataSource = combineMap(
      (rows, page): TablePageResponse<ITableRow> => ({
        data: rows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE),
        offset: page * PAGE_SIZE,
        pageSize: PAGE_SIZE
      }),
      sortedData,
      requestList
    )

    return [
      $card(
        $Table({
          dataSource,
          scrollConfig: { containerOps: style({ height: '400px' }) },
          sortChange: just(initialSort),
          columns: [
            {
              $head: $text('ID'),
              $body: map(row => $node($text(row.id))),
              sortBy: 'id'
            },
            {
              $head: $text('Random'),
              $body: map(row => $node($text(row.random.toString()))),
              sortBy: 'random'
            },
            {
              $head: $text('Reversed ID'),
              $body: map(row => $node($text([...row.id].reverse().join(''))))
            }
          ]
        })({
          scrollIndex: requestListTether(),
          sortBy: sortByTether()
        })
      )
    ]
  }
)
