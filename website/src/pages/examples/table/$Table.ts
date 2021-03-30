import { $text, Behavior, component } from "@aelea/core"
import { $Table, ScrollSegment } from "@aelea/ui-components"
import { chain, map } from "@most/core"


export default component((
  [sampleRequestList, requestList]: Behavior<ScrollSegment, ScrollSegment>
) => {

  const dataSource = map(position => {
    const totalItems = 1e6
    const segment = position.to - position.from
    const arr = Array(segment)
    const $items = arr.fill(null).map((x, i) => {
      const id = totalItems - (position.to - i) + 1

      return {
        id: 'item-#' + id
      }
    })

    return { totalItems, data: $items }
  }, requestList)

  return [
    $Table<{ id: string }>({
      dataSource,
      rowHeight: 31,
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
    })({ requestList: sampleRequestList() })
  ]
})
