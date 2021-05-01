import { $text, Behavior, component, style } from "@aelea/core"
import { $card, $Table, ScrollRequest, TablePageResponse } from "@aelea/ui-components"
import { chain, map } from "@most/core"


export const $TableExample = component((
  [requestList, requestListTether]: Behavior<ScrollRequest, ScrollRequest>
) => {

  const PAGE_SIZE = 100
  let i = 0

  const dataSource = map((): TablePageResponse<{ id: string }> => {
    const id = ++i
    const data = Array(PAGE_SIZE).fill(null).map(() => {
      return { id: 'item-#' + id }
    })

    return { data, pageSize: PAGE_SIZE }
  }, requestList)

  return [
    $card(
      $Table({
        dataSource,
        containerOps: style({
          height: '400px'
        }),
        columns: [
          {
            id: 'id',
            value: chain(x => $text(x.id)),
          },
          {
            id: 'id',
            value: chain(x => $text(x.id)),
          },
          {
            id: 'id',
            value: chain(x => $text(x.id)),
          }
        ],
      })({
        requestList: requestListTether()
      })
    )
  ]
})
