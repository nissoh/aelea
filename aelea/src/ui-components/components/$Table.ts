import {
  constant,
  empty,
  type IOps,
  type IStream,
  joinMap,
  just,
  map,
  merge,
  never,
  reduce,
  start,
  switchLatest,
  switchMap
} from '../../stream/index.js'
import type { IBehavior } from '../../stream-extended/index.js'
import { colorShade, palette, text } from '../../ui-components-theme/index.js'
import {
  $node,
  $svg,
  $text,
  attr,
  component,
  type I$Node,
  type I$Slottable,
  type INodeCompose,
  type ISlottable,
  nodeEvent,
  style
} from '../../ui-renderer-dom/index.js'
import { $column, $row } from '../elements/$elements.js'
import { $icon } from '../elements/$icon.js'
import { spacing } from '../style/spacing.js'
import { isDesktopScreen } from '../utils/screenUtils.js'
import { $defaultVScrollContainer, $QuantumScroll, type IPageRequest, type IQuantumScroll } from './$QuantumScroll.js'

export interface TablePageResponse<T> extends IPageRequest {
  page: T[]
}

export interface ISortBy<T, K extends keyof T = keyof T> {
  direction: 'asc' | 'desc'
  selector: K
}

export interface TableOption<T, FilterState = never> {
  columns: TableColumn<T>[]
  dataSource: IStream<Promise<TablePageResponse<T> | T[]>> | T[]

  scrollConfig?: Omit<IQuantumScroll, 'dataSource'>

  $between?: I$Node
  $rowCallback?: IOps<T, INodeCompose>

  $container?: INodeCompose
  $rowContainer?: INodeCompose
  $headerRowContainer?: INodeCompose

  $cell?: INodeCompose
  $bodyCell?: INodeCompose
  $headerCell?: INodeCompose

  sortChange?: IStream<ISortBy<T>>
  filterChange?: IStream<FilterState>
  $sortArrowDown?: I$Node
}

export interface TableColumn<T> {
  $head: I$Slottable
  $bodyCallback: IOps<T, I$Node>
  sortBy?: keyof T

  gridTemplate?: string

  $bodyCellContainer?: INodeCompose
  $headerCellContainer?: INodeCompose
}

export const $caretDown = $svg('path')(
  attr({
    d: 'M4.616.296c.71.32 1.326.844 2.038 1.163L13.48 4.52a6.105 6.105 0 005.005 0l6.825-3.061c.71-.32 1.328-.84 2.038-1.162l.125-.053A3.308 3.308 0 0128.715 0a3.19 3.19 0 012.296.976c.66.652.989 1.427.989 2.333 0 .906-.33 1.681-.986 2.333L18.498 18.344a3.467 3.467 0 01-1.14.765c-.444.188-.891.291-1.345.314a3.456 3.456 0 01-1.31-.177 2.263 2.263 0 01-1.038-.695L.95 5.64A3.22 3.22 0 010 3.309C0 2.403.317 1.628.95.98c.317-.324.68-.568 1.088-.732a3.308 3.308 0 011.24-.244 3.19 3.19 0 011.338.293z'
  })
)()

export const $defaultTableCell = $row(
  spacing.small,
  style({ padding: '6px 0', display: 'flex', minWidth: 0, alignItems: 'center', overflowWrap: 'break-word' })
)
export const $defaultTableHeaderCell = $defaultTableCell(style({ color: palette.foreground, fontSize: text.sm }))
export const $defaultTableRowContainer = $node(isDesktopScreen ? spacing.big : spacing.default)
export const $defaultTableContainer = $column(spacing.default, style({ flex: 1 }))

export const $Table = <T, FilterState = never>({
  dataSource,
  columns,
  scrollConfig,

  $container = $defaultTableContainer,
  $rowContainer = $defaultTableRowContainer,
  $headerRowContainer = $rowContainer,
  $cell = $defaultTableCell,
  $bodyCell = $cell,
  $headerCell = $defaultTableHeaderCell,
  $rowCallback,

  sortChange = never,
  filterChange = never,
  $between = empty,
  $sortArrowDown = $caretDown
}: TableOption<T, FilterState>) =>
  component(
    (
      [scrollRequest, scrollRequestTether]: IBehavior<IPageRequest, IPageRequest>,
      [sortByChange, sortByChangeTether]: IBehavior<ISlottable, keyof T>
    ) => {
      const gridTemplateColumns = style({
        display: 'grid',
        gridTemplateColumns: columns.map(col => col.gridTemplate || '1fr').join(' ')
      })

      const sortBy = joinMap(state => {
        const folded = reduce(
          (seed, change): ISortBy<T> => {
            const direction = seed.selector === change ? (seed.direction === 'asc' ? 'desc' : 'asc') : 'desc'
            return { direction, selector: change }
          },
          state,
          sortByChange
        )
        return start(state, folded)
      }, sortChange)

      const $sortArrow = (selector: keyof T, direction: 'asc' | 'desc') =>
        switchLatest(
          map(
            current =>
              $icon({
                $content: $sortArrowDown,
                svgOps: direction === 'asc' ? style({ transform: 'rotate(180deg)' }) : undefined,
                width: '8px',
                viewBox: '0 0 32 19.43',
                fill:
                  current.selector === selector && current.direction === direction
                    ? palette.message
                    : colorShade(palette.message, 25)
              }),
            sortBy
          )
        )

      const $header = $headerRowContainer(gridTemplateColumns)(
        ...columns.map(col => {
          const $headerCellContainer = col.$headerCellContainer ?? $headerCell
          if (!col.sortBy) return $headerCellContainer(col.$head)

          const colSortBy = col.sortBy
          return $headerCellContainer(
            style({ cursor: 'pointer' }),
            sortByChangeTether(nodeEvent('click'), constant(colSortBy))
          )(
            col.$head,
            switchLatest(
              map(
                current =>
                  $column(
                    style({
                      borderRadius: '50%',
                      padding: '6px',
                      border: `1px solid ${colorShade(palette.message, current.selector === colSortBy ? 25 : 7)}`
                    })
                  )($sortArrow(colSortBy, 'asc'), $sortArrow(colSortBy, 'desc')),
                sortBy
              )
            )
          )
        })
      )

      const renderRow = (rowData: T): I$Node => {
        const $cells = columns.map(col => {
          const $body = col.$bodyCellContainer ?? $bodyCell
          return $body(switchLatest(col.$bodyCallback(just(rowData))))
        })

        return $rowCallback
          ? switchMap($custom => $custom(gridTemplateColumns)(...$cells), $rowCallback(just(rowData)))
          : $rowContainer(gridTemplateColumns)(...$cells)
      }

      const $bodyContainer = scrollConfig?.$container ?? $defaultVScrollContainer
      const $emptyMessage =
        scrollConfig?.$emptyMessage ??
        $column(spacing.default, style({ padding: '20px' }))($text('No items to display'))

      const bodyNode: I$Node = Array.isArray(dataSource)
        ? dataSource.length === 0
          ? $emptyMessage
          : $bodyContainer(...dataSource.map(renderRow))
        : switchLatest(
            map(
              () =>
                $QuantumScroll({
                  ...scrollConfig,
                  dataSource: map(async resPromise => {
                    const res = await resPromise
                    if (Array.isArray(res)) {
                      const $items = res.map(renderRow)
                      return { $items, offset: 0, pageSize: $items.length }
                    }
                    return { $items: res.page.map(renderRow), offset: res.offset, pageSize: res.pageSize }
                  }, dataSource)
                })({
                  scrollRequest: scrollRequestTether()
                }),
              start(null as null, merge(sortByChange, filterChange))
            )
          )

      return [
        $container($header, $between, bodyNode),

        {
          scrollRequest,
          sortBy,
          filterChange
        }
      ]
    }
  )
