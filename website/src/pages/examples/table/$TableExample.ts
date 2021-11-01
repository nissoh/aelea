import { Behavior } from '@aelea/core'
import { $text, component, style } from '@aelea/dom'
import { $card, $Table, ISortBy, ScrollRequest, TablePageResponse } from "@aelea/ui-components"
import { combine, map, merge, now, snapshot } from "@most/core"
import { Stream } from '@most/types'


interface ITableRow {
  id: string
  random: number
}

export const $TableExample = component((
  [requestList, requestListTether]: Behavior<ScrollRequest, ScrollRequest>,
  [sortBy, sortByTether]: Behavior<ISortBy<ITableRow>, ISortBy<ITableRow>>,
) => {

  const PAGE_SIZE = 25
  let i = 0

  const data: ITableRow[] = Array(PAGE_SIZE).fill(null).map(() => {
    return { id: 'item-#' + ++i, random: Math.round(Math.random() * 100) }
  })

  const initialSort: Stream<ISortBy<ITableRow>> = now({ direction: 'asc', name: 'id' })

  const sortState = merge(initialSort, sortBy)

  const dataSource = combine((sortField, pageNumber): TablePageResponse<ITableRow> => {
    return {
      data: data.sort((a, b) => {
        const prop = sortField.name
        const valA = a[prop]
        const valB = b[prop]

        if (typeof valA === 'string' && typeof valB === 'string') {
          return sortField.direction === 'desc' ? valA.localeCompare(valB) : valB.localeCompare(valA)
        } else {
          // @ts-ignore
          return sortField.direction === 'desc' ?  valB - valA : valA - valB
        }
      }),
      offset: 0,
      pageSize: PAGE_SIZE,
    }
  }, sortState, requestList)

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
            $body: map(x => $text(x.id)),
            sortBy: 'id'
          },
          {
            $head: $text('Second'),
            $body: map(x => $text(x.id)),
          },
          {
            $head: $text('Random Number'),
            $body: map(x => $text(x.random.toString())),
            sortBy: 'random'
          }
        ],
      })({
        scrollIndex: requestListTether(),
        sortBy: sortByTether()
      })
    )
  ]
})
