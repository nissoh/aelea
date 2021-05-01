import { map, merge, now } from "@most/core"
import { Stream } from "@most/types"
import { $Branch, $text, Behavior, component, INode, O, Op, style, StyleCSS, stylePseudo } from '@aelea/core'
import { $row } from "../elements/$elements"
import { $VirtualScroll, QuantumScroll, ScrollRequest } from "./$VirtualScroll"
import { pallete } from "@aelea/ui-components-theme"
import layoutSheet from "../style/layoutSheet"


export interface TablePageResponse<T> {
  data: T[]
  pageSize: number,
}

export interface TableOption<T> extends Omit<QuantumScroll, 'dataSource'> {
  columns: TableColumn<T>[]
  dataSource: Stream<TablePageResponse<T>>
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
  style({ padding: '3px 6px' }),
  layoutSheet.flex
)

const $headerCell = $row(
  tableCellStyle,
  style({ fontSize: '15px', color: pallete.foreground, }),
)

const $bodyCell = $row(
  tableCellStyle,
)

const $rowContainer = $row(layoutSheet.spacing)
const $rowHeaderContainer = $rowContainer(style({ overflowY: 'scroll' }), stylePseudo('::-webkit-scrollbar', { backgroundColor: 'transparent', width: '6px' }))


export const $Table = <T>(config: TableOption<T>) => component((
  [requestList, requestListTether]: Behavior<ScrollRequest, ScrollRequest>
) => {

  const $header = $rowHeaderContainer(
    ...config.columns.map(col => {
      return $headerCell(style(col.cellStyle ?? { }))(
        col.header ?? elipsisTextOverflow($text(String(col.id)))
      )
    })
  )

  const dataSource = map(({ data, pageSize }) => {
    const $items = data.map(rowData =>
      $rowContainer(
        ...config.columns.map(col =>
          $bodyCell(style(col.cellStyle ?? {}))(
            col.value(now(rowData))
          )
        )
      )
    )
    return { $items, pageSize }
  }, config.dataSource)

  const $body = $VirtualScroll({
    ...config,
    dataSource
  })({
    scrollRequest: requestListTether()
  })

  return [
    merge(
      $body,
      $header,
    ),

    { requestList }
  ]

})
