import { attr, component, type IBehavior, nodeEvent, o, style, stylePseudo } from '../../core/index.js'
import type { I$Node, I$Slottable, ISlottable } from '../../core/source/node.js'
import { $node, $svg } from '../../core/source/node.js'
import {
  chain,
  constant,
  type IOps,
  type IStream,
  map,
  merge,
  never,
  now,
  op,
  scan,
  startWith,
  switchLatest
} from '../../stream/index.js'
import { $column, $row } from '../elements/$elements.js'
import { $icon } from '../elements/$icon.js'
import { layoutSheet } from '../style/layoutSheet.js'
import { spacing } from '../style/spacing.js'
import { pallete } from '../../ui-components-theme/globalState.js'
import {
  $VirtualScroll,
  type IScrollPagableReponse,
  type QuantumScroll,
  type ScrollRequest,
  type ScrollResponse
} from './$VirtualScroll.js'

export type TablePageResponse<T> = T[] | (Omit<IScrollPagableReponse, '$items'> & { data: T[] })

export interface IPageRequest {
  page: ScrollRequest
  pageSize: number
}

export interface ISortBy<T> {
  direction: 'asc' | 'desc'
  name: keyof T
}

export interface TableOption<T, FilterState> {
  columns: TableColumn<T>[]

  dataSource: IStream<TablePageResponse<T>>
  scrollConfig?: Omit<QuantumScroll, 'dataSource'>

  bodyContainerOp?: IOps<ISlottable, ISlottable>

  cellOp?: IOps<ISlottable, ISlottable>
  headerCellOp?: IOps<ISlottable, ISlottable>
  bodyCellOp?: IOps<ISlottable, ISlottable>

  sortChange?: IStream<ISortBy<T>>
  filterChange?: IStream<FilterState>
  $sortArrowDown?: I$Slottable
}

export interface TableColumn<T> {
  $head: I$Slottable
  $body: IOps<T, I$Node>
  sortBy?: keyof T

  columnOp?: IOps<ISlottable, ISlottable>
}

export const $Table = <T, FilterState = never>({
  dataSource,
  columns,
  scrollConfig,
  cellOp,
  headerCellOp,
  bodyCellOp,
  bodyContainerOp = o(),
  sortChange = never,
  filterChange = never,
  $sortArrowDown = $caretDown
}: TableOption<T, FilterState>) =>
  component(
    (
      [scrollIndex, scrollIndexTether]: IBehavior<ScrollRequest, ScrollRequest>,
      [sortByChange, sortByChangeTether]: IBehavior<ISlottable, keyof T>
    ) => {
      const cellStyle = o(style({ padding: '3px 6px', overflowWrap: 'break-word' }), layoutSheet.flex)

      const $cellHeader = $row(
        cellStyle,
        spacing.small,
        style({
          fontSize: '15px',
          alignItems: 'center',
          color: pallete.foreground
        }),
        cellOp || o(),
        headerCellOp || o()
      )

      const cellBodyOp = o(cellStyle, cellOp || o(), bodyCellOp || o())

      const $rowContainer = $row(spacing.default)

      const $rowHeaderContainer = $rowContainer(
        style({ overflow: 'auto' }),
        stylePseudo('::-webkit-scrollbar', {
          backgroundColor: 'transparent',
          width: '6px'
        })
      )

      const sortBy = chain((state) => {
        const changeState = scan(
          (seed, change): ISortBy<T> => {
            const direction = seed.name === change ? (seed.direction === 'asc' ? 'desc' : 'asc') : 'desc'

            return { direction, name: change }
          },
          state,
          sortByChange
        )

        return startWith(state, changeState)
      }, sortChange)

      const $header = $rowHeaderContainer(
        ...columns.map((col) => {
          if (col.sortBy) {
            const behavior = sortByChangeTether(nodeEvent('click'), constant(col.sortBy))

            // const newLocal_1 = col.columnOp ? $cellHeader(behavior, col.columnOp) : $cellHeader(behavior)

            return $cellHeader(behavior, col.columnOp || o())(
              $node(style({ cursor: 'pointer' }))(col.$head),
              switchLatest(
                map((s) => {
                  return $column(style({ cursor: 'pointer' }))(
                    $icon({
                      $content: $sortArrowDown,
                      fill:
                        s.name === col.sortBy ? (s.direction === 'asc' ? pallete.foreground : '') : pallete.foreground,
                      svgOps: style({ transform: 'rotate(180deg)' }),
                      width: '8px',
                      viewBox: '0 0 32 19.43'
                    }),
                    $icon({
                      $content: $sortArrowDown,
                      fill:
                        s.name === col.sortBy ? (s.direction === 'desc' ? pallete.foreground : '') : pallete.foreground,
                      width: '8px',
                      viewBox: '0 0 32 19.43'
                    })
                  )
                }, sortBy)
              )
            )
          }

          const $headCell = $cellHeader(col.columnOp || o())(col.$head)

          return $headCell
        })
      )

      const requestPageFilters = merge(sortByChange, filterChange)

      const $body = switchLatest(
        map(
          () => {
            return $VirtualScroll({
              ...scrollConfig,
              dataSource: map((res): ScrollResponse => {
                const $items = (Array.isArray(res) ? res : res.data).map((rowData) =>
                  $rowContainer(
                    ...columns.map((col) => {
                      const cellOps = o(cellBodyOp, col.columnOp || o())
                      return cellOps(switchLatest(col.$body(now(rowData))))
                    })
                  )
                )

                if (Array.isArray(res)) {
                  return $items
                }

                return {
                  $items,
                  offset: res.offset,
                  pageSize: res.pageSize
                }
              }, dataSource)
            })({
              scrollIndex: scrollIndexTether()
            })
          },
          startWith(null, requestPageFilters)
        )
      )

      return [
        $column(bodyContainerOp)($header, $body),

        {
          scrollIndex,
          sortBy,
          filterChange
        }
      ]
    }
  )

export const $caretDown = $svg('path')(
  attr({
    d: 'M4.616.296c.71.32 1.326.844 2.038 1.163L13.48 4.52a6.105 6.105 0 005.005 0l6.825-3.061c.71-.32 1.328-.84 2.038-1.162l.125-.053A3.308 3.308 0 0128.715 0a3.19 3.19 0 012.296.976c.66.652.989 1.427.989 2.333 0 .906-.33 1.681-.986 2.333L18.498 18.344a3.467 3.467 0 01-1.14.765c-.444.188-.891.291-1.345.314a3.456 3.456 0 01-1.31-.177 2.263 2.263 0 01-1.038-.695L.95 5.64A3.22 3.22 0 010 3.309C0 2.403.317 1.628.95.98c.317-.324.68-.568 1.088-.732a3.308 3.308 0 011.24-.244 3.19 3.19 0 011.338.293z'
  })
)()
