import {
  delay,
  empty,
  filter,
  type IOps,
  type IStream,
  joinMap,
  map,
  merge,
  op,
  reduce,
  skip,
  start,
  switchLatest
} from '../../stream/index.js'
import { type IBehavior, multicast } from '../../stream-extended/index.js'
import { pallete } from '../../ui-components-theme/index.js'
import type { I$Node, INode } from '../../ui-renderer-dom/index.js'
import { $custom, $node, $text, component, style } from '../../ui-renderer-dom/index.js'
import { $column } from '../elements/$elements.js'
import { designSheet } from '../style/designSheet.js'
import { observer } from '../utils/elementObservers.js'

export type ScrollRequest = number

export type IScrollPagableReponse = {
  $items: I$Node[]
  pageSize: number
  offset: number
}

export type ScrollResponse = I$Node[] | IScrollPagableReponse

export interface QuantumScroll {
  dataSource: IStream<ScrollResponse>

  $loader?: I$Node

  containerOps?: IOps<INode>
}

const $defaultLoader = $node(style({ color: pallete.foreground, padding: '3px 10px' }))($text('Loading...'))

export const $VirtualScroll = ({ dataSource, containerOps = op, $loader = $defaultLoader }: QuantumScroll) =>
  component(([intersecting, intersectingTether]: IBehavior<INode<HTMLElement>, IntersectionObserverEntry[]>) => {
    const multicastDatasource = multicast(dataSource)

    const scrollReuqestWithInitial: IStream<ScrollRequest> = skip(
      1,
      reduce(seed => seed + 1, -1, intersecting)
    )

    const $container = $column(designSheet.customScroll, style({ overflow: 'auto' }), containerOps)

    // Each visibility-into-view event = "fetch next page". Filter to entering events only;
    // exits would double-trigger.
    const intersectedLoader = intersectingTether(
      observer.intersection(),
      filter(entries => entries[0]?.isIntersecting === true)
    )

    const $observer = $custom('observer')(intersectedLoader)()

    const delayDatasource = delay(45, multicastDatasource)
    const loadState = merge(
      map(data => ({ $intermediate: $observer, data }), delayDatasource),
      map(() => ({ $intermediate: $loader }), scrollReuqestWithInitial)
    )

    const $itemLoader = map(state => {
      if ('data' in state && state.data) {
        if (Array.isArray(state.data)) {
          return empty
        }

        const hasMoreItems = state.data.pageSize === state.data.$items.length
        const value = hasMoreItems ? state.$intermediate : empty

        return value
      }

      return state.$intermediate
    }, loadState)

    return [
      $container(
        joinMap($list => {
          const $items = Array.isArray($list) ? $list : $list.$items
          return merge(...$items)
        }, multicastDatasource),
        switchLatest(start($observer, $itemLoader))
      ),

      { scrollIndex: scrollReuqestWithInitial }
    ]
  })
