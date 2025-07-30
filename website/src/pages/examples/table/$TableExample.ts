import { combine, map, merge, now } from '@most/core'
import type { IBehavior } from 'aelea/core'
import { $node, $text, component, style } from 'aelea/core'
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

    const initialSort: IStream<ISortBy<ITableRow>> = now({
      direction: 'asc',
      name: 'id'
    })

    const sortState = merge(initialSort, sortBy)

    const dataSource = combine(
      (sortField, _): TablePageResponse<ITableRow> => {
        return {
          data: data.sort((a, b) => {
            const prop = sortField.name
            const valA = a[prop]
            const valB = b[prop]

            if (typeof valA === 'string' && typeof valB === 'string') {
              return sortField.direction === 'desc' ? valA.localeCompare(valB) : valB.localeCompare(valA)
            }
            // @ts-ignore
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
              $head: $text('First'),
              $body: map((x) => $node($text(x.id))),
              sortBy: 'id'
            },
            {
              $head: $text('Second'),
              $body: map((x) => $node($text(x.id)))
            },
            {
              $head: $text('Random Number'),
              $body: map((x) => $node($text(x.random.toString()))),
              sortBy: 'random'
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
