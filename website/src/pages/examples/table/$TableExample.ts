import { $text, Behavior, component } from "@aelea/core"
import { $Table, ScrollRequest, TablePageResponse } from "@aelea/ui-components"
import { chain, map } from "@most/core"


export const $TableExample = component((
  [sampleRequestList, requestList]: Behavior<ScrollRequest, ScrollRequest>
) => {

  let i = 0

  const dataSource = map((): TablePageResponse<{ id: string }> => {
    const id = ++i
    const data = Array(100).fill(null).map((x, i) => {
      return { id: 'item-#' + id }
    })

    return { data, totalItems: 1000 }
  }, requestList)

  return [
    $Table({
      dataSource,
      containerStyle: {
        height: '400px'
      },
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
      requestList: sampleRequestList()
    })
  ]
})
