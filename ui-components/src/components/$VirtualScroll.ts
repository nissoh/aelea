
import { chain, delay, empty, filter, loop, map, merge, mergeArray, multicast, scan, skip, startWith, switchLatest } from "@most/core"
import { Stream } from '@most/types'
import { $Branch, Behavior, component, IBranch, style, $text, $Node, $custom, Op, O } from '@aelea/core'
import { $column } from '../elements/$elements'
import { pallete } from "@aelea/ui-components-theme"
import * as observer from "../utils/elementObservers"
import designSheet from "../style/designSheet"


export type ScrollRequest = number

export interface ScrollResponse {
  $items: $Branch[]
  pageSize: number
}

export interface QuantumScroll {
  dataSource: Stream<ScrollResponse>

  $loading?: $Node

  containerOps?: Op<IBranch, IBranch>
}


const $defaultLoader = $text(style({ color: pallete.foreground, padding: '3px 10px' }))('loading...')


export const $VirtualScroll = ({ dataSource, containerOps = O(), $loading = $defaultLoader }: QuantumScroll) => component((
  [intersecting, intersectingTether]: Behavior<IBranch, IntersectionObserverEntry>,
) => {

  const multicastDatasource = multicast(dataSource)

  const scrollReuqestWithInitial: Stream<ScrollRequest> = skip(1, scan(seed => seed + 1, -1, intersecting))

  const $container = $column(
    designSheet.customScroll,
    style({ overflow: 'auto' }),
    map(node => ({ ...node, insertAscending: false })),
    containerOps
  )
  
  const intersectedLoader = intersectingTether(
    observer.intersection({ threshold: 1 }),
    map(entryList => entryList[0]),
    filter(entry => {
      return entry.isIntersecting === true
    }),
  )

  const $observer = $custom('observer')(intersectedLoader)()

  const newLocal = delay(45, multicastDatasource)
  const loadState = merge(
    map(data => ({ $show: $observer, data }), newLocal),
    map(() => ({ $show: $loading, }), scrollReuqestWithInitial)
  )
  
  const $itemLoader = loop((seed, state) => {

    if ('data' in state && state.data) {
      const hasMoreItems = state.data.pageSize === state.data.$items.length
      const value = hasMoreItems ? state.$show : empty()

      return { seed, value }
    }

    return { seed, value: state.$show }
  }, {  }, loadState)

  return [
    $container(
      chain(node => {
        return mergeArray(node.$items) // TODO optimze this. batching pages is not very efficient. use continous render per item during scroll
      }, multicastDatasource),
      switchLatest(
        startWith($observer, $itemLoader)
      )
    ),

    { scrollRequest: scrollReuqestWithInitial }
  ]
})