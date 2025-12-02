import {
  delay,
  empty,
  filter,
  type IOps,
  type IStream,
  joinMap,
  map,
  merge,
  o,
  reduce,
  skip,
  start,
  switchLatest
} from '@/stream'
import { type IBehavior, multicast } from '@/stream-extended'
import type { I$Node, INode } from '@/ui'
import { $custom, $node, $text, component, style } from '@/ui'
import { pallete } from '@/ui-components-theme'
import { $column } from '../elements/$elements.js'
import { designSheet } from '../style/designSheet.js'

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

export const $VirtualScroll = ({ dataSource, containerOps = o(), $loader = $defaultLoader }: QuantumScroll) =>
  component(([intersecting, intersectingTether]: IBehavior<INode, IntersectionObserverEntry>) => {
    const multicastDatasource = multicast(dataSource)

    const scrollReuqestWithInitial: IStream<ScrollRequest> = skip(
      1,
      reduce(seed => seed + 1, -1, intersecting)
    )

    const $container = $column(
      designSheet.customScroll,
      style({ overflow: 'auto' }),
      map(node => ({ ...node, insertAscending: false })),
      containerOps
    )

    const intersectedLoader = intersectingTether(
      // TODO: reintroduce a typed intersection helper; keeping a placeholder no-op for now
      map(() => null as any),
      filter(() => false)
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
