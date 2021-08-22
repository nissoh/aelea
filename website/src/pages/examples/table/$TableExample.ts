import { Behavior } from '@aelea/core'
import { $text, component, style } from '@aelea/dom'
import { $card, $Table, ScrollRequest } from "@aelea/ui-components"
import { map } from "@most/core"


export const $TableExample = component((
  [requestList, requestListTether]: Behavior<ScrollRequest, ScrollRequest>
) => {

  const PAGE_SIZE = 100
  let i = 0



  return [
    $card(
      $Table<{id: 'd'}>({
        dataSource: map(() => {
          const id = ++i
          const data = Array(PAGE_SIZE).fill(null).map(() => {
            return { id: 'item-#' + id }
          })

          return { data, pageSize: PAGE_SIZE }
        }, requestList),
        bodyContainerOp: style({ height: '400px' }),
        columns: [
          {
            $head: $text('First'),
            valueOp: map(x => $text(x.id)),
          },
          {
            $head: $text('Second'),
            valueOp: map(x => $text(x.id)),
          },
          {
            $head: $text('Third'),
            valueOp: map(x => $text(x.id)),
          }
        ],
      })({
        requestList: requestListTether()
      })
    )
  ]
})
