import { empty, filter, type IStream, joinMap, just, map, merge, until } from '../../stream/index.js'
import type { IBehavior } from '../../stream-extended/index.js'
import {
  $custom,
  $node,
  $text,
  component,
  type I$Node,
  type INodeCompose,
  type ISlottable,
  style
} from '../../ui-renderer-dom/index.js'
import { $column } from '../elements/$elements.js'
import { spacing } from '../style/spacing.js'
import { observer } from '../utils/elementObservers.js'
import { $intermediatePromise, $spinner } from './$IntermediateDisplay.js'

export interface IQuantumScrollPage {
  pageSize: number
  offset: number
  $items: I$Node[]
}

export interface IPageRequest {
  offset: number
  pageSize: number
}

export interface IQuantumScroll {
  dataSource: IStream<Promise<IQuantumScrollPage>>
  $container?: INodeCompose
  $loader?: I$Node
  $emptyMessage?: I$Node
  $$fail?: (error: unknown) => I$Node
  /** Render newest-on-top by reversing the container's main axis. */
  insertAscending?: boolean
}

export const $defaultVScrollContainer = $column(spacing.default)
const $defaultEmptyMessage = $column(spacing.default, style({ padding: '20px' }))($text('No items to display'))

export const $QuantumScroll = ({
  dataSource,
  $container = $defaultVScrollContainer,
  $emptyMessage = $defaultEmptyMessage,
  $loader = $spinner,
  $$fail,
  insertAscending = false
}: IQuantumScroll) =>
  component(([scrollRequest, scrollRequestTether]: IBehavior<ISlottable<Node>, IPageRequest>) => {
    const $orientedContainer = insertAscending ? $container(style({ flexDirection: 'column-reverse' })) : $container

    return [
      $orientedContainer(
        joinMap(dataPromise => {
          const $page = dataPromise.then(response => {
            const itemCount = response.$items.length
            const isFirstPage = response.offset === 0
            const hasMore = itemCount > 0 && itemCount === response.pageSize

            if (isFirstPage && itemCount === 0) return $emptyMessage
            // Non-first empty page: server told us we're past the end. Don't
            // re-mount the sentinel — its previous fire will have been
            // cancelled by `until(scrollRequest, ...)` already.
            if (itemCount === 0) return empty
            if (!hasMore) return merge(...response.$items)

            const nextOffset = response.offset + response.pageSize
            const $sentinel = $custom('observer')(
              scrollRequestTether(
                observer.intersection({ threshold: 0.25, rootMargin: '200px 0px 200px 0px' }),
                filter(entries => entries[0]?.isIntersecting === true),
                map(() => ({ offset: nextOffset, pageSize: response.pageSize }))
              )
            )($node(style({ height: '12px', width: '100%' }))())

            return merge(...response.$items, until(scrollRequest, $sentinel))
          })

          return $intermediatePromise({ $loader, $$fail, $display: just($page) })
        }, dataSource)
      ),

      { scrollRequest }
    ]
  })
