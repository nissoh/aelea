import { map, merge, now } from "@most/core"
import { Stream } from "@most/types"
import { $Branch, $text, Behavior, component, INode, O, Op, style, StyleCSS, stylePseudo } from '@aelea/core'
import { $row } from "../$elements"
import { $QuantumScroll, QuantumScroll, ScrollSegment } from "./$QuantumScroll"
import { pallete } from "@aelea/ui-components-theme"
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
  value: Op<T, INode>,
  cellStyle?: StyleCSS
}


const elipsisTextOverflow = style({
  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
})
const tableCellStyle = O(
  style({
    padding: '3px 6px'
  }),
  layoutSheet.flex
)

const $headerCell = $row(
  tableCellStyle,
  style({ fontSize: '15px', color: pallete.description, }),
)

const $bodyCell = $row(
  tableCellStyle,
)

const $rowContainer = $row(layoutSheet.spacing)



export const $Table = <T>(config: TableOption<T>) => {
  return component((
    [sampleRequestList, requestList]: Behavior<ScrollSegment, ScrollSegment>
  ) => {

    const $header = $rowContainer(style({ overflowY: 'scroll' }), stylePseudo('::-webkit-scrollbar', { backgroundColor: 'transparent' }))(
      ...config.columns.map(col => {
        return $headerCell(style(col.cellStyle ?? { height: config.rowHeight + 'px' }))(
          col.header ?? elipsisTextOverflow($text(String(col.id)))
        )
      })
    )

    const dataStream = map(({ data, totalItems }) => {

      const $items = data.map(rowData =>
        $rowContainer(
          ...config.columns.map(col =>
            $bodyCell(style(col.cellStyle ?? {}))(
              col.value(now(rowData))
            )
          )
        )
      )

      return { $items, totalItems }
    }, config.dataSource)

    const $body = $QuantumScroll({
      ...config,
      dataSource: dataStream
    })({
      requestSource: sampleRequestList()
    })

    return [
      merge(
        $body,
        $header,
      ),

      { requestList }
    ]

  })

}
