import { map, now } from "@most/core"
import { Stream } from "@most/types"
import { $Node, $text, Behavior, component, NodeChild, Op, style } from '@aelea/core'
import { $column, $row } from "../common/common"
import { spacing, theme } from "../common/stylesheet"
import $QuantumScroll, { QuantumScroll, ScrollSegment } from "./$QuantumScroll"


export interface Response<T> {
  data: T[]
  totalItems: number,
}

export interface TableOption<T> extends Omit<QuantumScroll, 'dataSource'> {
  columns: TableColumn<T>[]
  dataSource: Stream<Response<T>>
}

export interface TableColumn<T> {
  id: keyof T
  header?: $Node
  value: Op<T, NodeChild>
}


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



export default <T>(config: TableOption<T>) => {
  return component((
    [sampleObserved, observed]: Behavior<ScrollSegment, ScrollSegment>
  ) => {

    const $header = $cellContainer(
      ...config.columns.map(col => {
        return $headerCell(
          col.header ?? elipsisTextOverflow($text(String(col.id)))
        )
      })
    )

    const dataStream = map(({ data, totalItems }) => {

      const $items = data.map(rowData =>
        $cellContainer(
          ...config.columns.map(col =>
            $bodyCell(
              col.value(now(rowData))
            )
          )
        )
      )

      return { $items, totalItems }
    }, config.dataSource)

    const $body = $QuantumScroll({
      maxContainerHeight: config.maxContainerHeight,
      rowHeight: config.rowHeight,
      dataSource: dataStream
    })({
      scroll: sampleObserved()
    })

    return [
      $column(style({ margin: '0 16px' }))(
        $header,
        $body
      ),

      {
        observed
      }
    ]

  })

}
