import { combineMap, type IStream, just, map, merge } from 'aelea/stream'
import type { IBehavior } from 'aelea/stream-extended'
import { $node, $text, component, style } from 'aelea/ui'
import { $card, $Table, type ISortBy, type ScrollRequest, type TablePageResponse } from 'aelea/ui-components'

interface ITableRow {
  id: string
  random: number
}

export const $TableExample = component(
  (
    [requestList, requestListTether]: IBehavior<ScrollRequest, ScrollRequest>,
    [sortBy, sortByTether]: IBehavior<ISortBy<ITableRow>, ISortBy<ITableRow>>
  ) => {
    const PAGE_SIZE = 25
    let i = 0

    const data: ITableRow[] = Array(PAGE_SIZE)
      .fill(null)
      .map(() => {
        return { id: `item-#${++i}`, random: Math.round(Math.random() * 100) }
      })

    const initialSort: IStream<ISortBy<ITableRow>> = just({
      direction: 'asc',
      name: 'id'
    })

    const sortState = merge(initialSort, sortBy)

    const dataSource = combineMap(
      (sortField, _): TablePageResponse<ITableRow> => {
        return {
          data: data.sort((a, b) => {
            const prop = sortField.name
            const valA = a[prop]
            const valB = b[prop]

            if (typeof valA === 'string' && typeof valB === 'string') {
              return sortField.direction === 'desc' ? valB.localeCompare(valA) : valA.localeCompare(valB)
            }
            // @ts-expect-error
            return sortField.direction === 'desc' ? valB - valA : valA - valB
          }),
          offset: 0,
          pageSize: PAGE_SIZE
        }
      },
      sortState,
      requestList
    )

    return [
      $card(
        $Table({
          dataSource,
          scrollConfig: {
            containerOps: style({ height: '400px' })
          },
          sortChange: initialSort,
          columns: [
            {
              $head: $text('ID'),
              $body: map(x => $node($text(x.id))),
              sortBy: 'id'
            },
            {
              $head: $text('Random'),
              $body: map(x => $node($text(x.random.toString()))),
              sortBy: 'random'
            },
            {
              $head: $text('Reversed ID'),
              $body: map(x => $node($text([...x.id].reverse().join(''))))
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
