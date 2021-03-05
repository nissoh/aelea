import { map, now } from "@most/core"
import { Stream } from "@most/types"
import { $Branch, $text, Behavior, component, INode, Op, style } from '@aelea/core'
import { $column, $row } from "../$elements"
import { $QuantumScroll, QuantumScroll, ScrollSegment } from "./$QuantumScroll"
import { theme } from "@aelea/ui-components-theme"
import layoutSheet from "../style/layoutSheet"


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
  header?: $Branch
  value: Op<T, INode>
}


const elipsisTextOverflow = style({
  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
})
const tableCellStyle = style({
  padding: '6px 0', width: '150px', height: '30px', flex: 1
})

const $headerCell = $row(
  tableCellStyle,
  style({ fontSize: '15px', color: theme.system, }),
)

const $bodyCell = $row(
  tableCellStyle,
)

const $rowContainer = $row(layoutSheet.spacing)



export const $Table = <T>(config: TableOption<T>) => {
  return component((
    [sampleRequestList, requestList]: Behavior<ScrollSegment, ScrollSegment>
  ) => {

    const $header = $rowContainer(
      ...config.columns.map(col => {
        return $headerCell(
          col.header ?? elipsisTextOverflow($text(String(col.id)))
        )
      })
    )

    const dataStream = map(({ data, totalItems }) => {

      const $items = data.map(rowData =>
        $rowContainer(
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
      scroll: sampleRequestList()
    })

    return [
      $column(style({ margin: '0 16px' }))(
        $header,
        $body
      ),

      { requestList }
    ]

  })

}
