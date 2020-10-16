import { map, now, switchLatest } from "@most/core"
import { $Node, $text, Behavior, component, NodeChild, O, Op, style } from "fufu"
import $QuantomScroll, { QuantomScroll, Position } from "./$QuantomScroll"
import { $column, $row } from "../common/common"
import { spacing, theme } from "../common/stylesheet"
import { Stream } from "@most/types"


const elipsisTextOverflow = style({
  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
})
const tableCellStyle = style({
  padding: '6px 0', width: '150px', height: '30px'
})

const $headerCell = $row(
  tableCellStyle,
  style({ fontSize: '15px', color: theme.system, flex: 1 }),
)

const $bodyCell = $row(
  tableCellStyle,
)

const $cellContainer = $row(spacing)

export interface Response<T> {
  data: T[]
  totalItems: number,
}

interface TableOption<T> extends Omit<QuantomScroll, 'queryItemsOp'> {
  columns: TableColumn<T>[]
  queryItemsOp: Op<Position, Stream<Response<T>>>
}

interface TableColumn<T> {
  id: keyof T
  header?: $Node
  value: Op<T, NodeChild>
}




export default <T>(props: TableOption<T>) => {

  const $header = $cellContainer(
    ...props.columns.map(col => {
      return $headerCell(
        col.header ?? elipsisTextOverflow($text(String(col.id)))
      )
    })
  )

  const $body = $QuantomScroll({
    maxContainerHeight: props.maxContainerHeight,
    queryItemsOp: O(
      props.queryItemsOp,
      switchLatest,
      map(({ data, totalItems }) => {

        const $items = data.map(rowData =>
          $cellContainer(
            ...props.columns.map(col =>
              $bodyCell(
                col.value(now(rowData))
              )
            )
          )
        )

        return now({ $items, totalItems })
      })
    ),
    rowHeight: props.rowHeight
  })({})

  return component((
    []: Behavior<any, any>
  ) => {
    return [
      $column(style({ margin: '0 16px' }))(
        $header,
        $body
      )
    ]

  })

}
