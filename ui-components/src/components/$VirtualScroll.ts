
import { chain, constant, empty, filter, map, merge, mergeArray, multicast, scan, skip, switchLatest, until } from "@most/core"
import { Stream } from '@most/types'
import { $Branch, Behavior, component, IBranch, style, $text, StyleCSS, $Node, $custom } from '@aelea/core'
import { $column } from '../$elements'
import { pallete } from "@aelea/ui-components-theme"
import * as observer from "../utils/elementObservers"


export type ScrollRequest = number

export interface ScrollResponse {
  $items: $Branch[]
  totalItems: number
}

export interface QuantumScroll {
  dataSource: Stream<ScrollResponse>

  $loading?: $Node

  containerStyle?: StyleCSS
}


const $defaultLoader = $text(style({ color: pallete.foreground, padding: '3px 10px' }))('loading...')


export const $VirtualScroll = ({ dataSource, containerStyle = {}, $loading = $defaultLoader }: QuantumScroll) => component((
  [sampleIntersecting, intersecting]: Behavior<IBranch, IntersectionObserverEntry>,
) => {

  const multicastDatasource = multicast(dataSource)

  const filterIntersecting = filter(entry => {
    return entry.isIntersecting === true
  }, intersecting)

  const scrollReuqestWithInitial: Stream<ScrollRequest> = multicast(
    skip(1, scan(seed => seed + 1, 0, filterIntersecting))
  )

  const $container = $column(
    style({ overflow: 'auto', ...containerStyle }),
    map(node => ({ ...node, insertAscending: false }))
  )
  
  const $observer = $custom('observer')(
    sampleIntersecting(
      observer.intersection({ threshold: 1 }),
      map(entryList => entryList[0]),
    )
  )()
  
  const $itemLoader = merge(
    constant(empty(), multicastDatasource),
    constant($loading, scrollReuqestWithInitial)
  )

  const accumulateResultCount = scan((seed, res) => ({ totalItems: res.totalItems, accumulated: seed.accumulated + res.$items.length }), { totalItems: 0, accumulated:0 }, multicastDatasource)
  const lastPage = skip(1, filter(res => {

    return res.totalItems === res.accumulated
  }, accumulateResultCount))

  const endPagingSignal = until(lastPage)
  
  return [
    $container(
      chain(node => {
        return mergeArray(node.$items) // TODO optimze this. batching pages is not very efficient. use continous render per item during scroll
      }, multicastDatasource),
      endPagingSignal($observer),
      endPagingSignal(switchLatest($itemLoader)),
    ),

    { scrollRequest: scrollReuqestWithInitial }
  ]
})