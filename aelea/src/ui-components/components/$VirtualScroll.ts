import {
  chain,
  delay,
  empty,
  filter,
  loop,
  map,
  merge,
  mergeArray,
  multicast,
  scan,
  skip,
  startWith,
  switchLatest,
} from '@most/core'
import type { Stream } from '@most/types'
import { O } from '../../core/common.js'
import type { Behavior, Ops } from '../../core/types.js'
import { $custom, $text, component, style } from '../../dom/index.js'
import type { $Branch, $Node, IBranch } from '../../dom/types.js'
import { pallete } from '../../ui-components-theme/globalState.js'
import { $column } from '../elements/$elements.js'
import { designSheet } from '../style/designSheet.js'
import { observer } from '../utils/elementObservers.js'
import { $p } from '../../dom/source/node.js'

export type ScrollRequest = number

export type IScrollPagableReponse = {
  $items: $Branch[]
  pageSize: number
  offset: number
}

export type ScrollResponse = $Branch[] | IScrollPagableReponse

export interface QuantumScroll {
  dataSource: Stream<ScrollResponse>

  $loader?: $Node

  containerOps?: Ops<IBranch, IBranch>
}

const $defaultLoader = $p(
  style({ color: pallete.foreground, padding: '3px 10px' }),
)($text('Loading...'))

export const $VirtualScroll = ({
  dataSource,
  containerOps = O(),
  $loader = $defaultLoader,
}: QuantumScroll) =>
  component(
    ([intersecting, intersectingTether]: Behavior<
      IBranch,
      IntersectionObserverEntry
    >) => {
      const multicastDatasource = multicast(dataSource)

      const scrollReuqestWithInitial: Stream<ScrollRequest> = skip(
        1,
        scan((seed) => seed + 1, -1, intersecting),
      )

      const $container = $column(
        designSheet.customScroll,
        style({ overflow: 'auto' }),
        map((node) => ({ ...node, insertAscending: false })),
        containerOps,
      )

      const intersectedLoader = intersectingTether(
        observer.intersection({ threshold: 1 }),
        map((entryList) => entryList[0]),
        filter((entry) => {
          return entry.isIntersecting === true
        }),
      )

      const $observer = $custom('observer')(intersectedLoader)()

      const delayDatasource = delay(45, multicastDatasource)
      const loadState = merge(
        map((data) => ({ $intermediate: $observer, data }), delayDatasource),
        map(() => ({ $intermediate: $loader }), scrollReuqestWithInitial),
      )

      const $itemLoader = loop(
        (seed, state) => {
          if ('data' in state && state.data) {
            if (Array.isArray(state.data)) {
              return { seed, value: empty() }
            }

            const hasMoreItems =
              state.data.pageSize === state.data.$items.length
            const value = hasMoreItems ? state.$intermediate : empty()

            return { seed, value }
          }

          return { seed, value: state.$intermediate }
        },
        {},
        loadState,
      )

      return [
        $container(
          chain(($list) => {
            const $items = Array.isArray($list) ? $list : $list.$items
            return mergeArray($items)
          }, multicastDatasource),
          switchLatest(startWith($observer, $itemLoader)),
        ),

        { scrollIndex: scrollReuqestWithInitial },
      ]
    },
  )
