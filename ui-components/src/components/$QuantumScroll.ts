
import { delay, map, merge, mergeArray, multicast, skipRepeatsWith, startWith, switchLatest } from "@most/core"
import { Stream } from '@most/types'
import { $node, $Branch, Behavior, component, event, IBranch, style, styleInline, $text, StyleCSS, $Node } from '@aelea/core'
import { $column } from '../$elements'
import { theme } from "@aelea/ui-components-theme"
import designSheet from "../style/designSheet"


export interface ScrollSegment {
  from: number
  to: number
  delta: number
  pageSize: number
}

export interface ScrollResponse {
  $items: $Branch[]
  totalItems: number,
}

export interface QuantumScroll {
  rowHeight: number
  maxContainerHeight: number
  dataSource: Stream<ScrollResponse>


  threshold?: number
  $loading?: $Node

  containerStyle?: StyleCSS
}


function getPageRequest(offsetTop: number, containerHeight: number, rowHeight: number, threshold: number): ScrollSegment {

  const top = Math.floor(offsetTop / rowHeight)
  const pageSize = Math.floor((containerHeight / rowHeight) + threshold)

  const from = Math.max(0, top - (top % threshold))
  const to = from + pageSize
  const delta = to - from

  return { from, to, pageSize, delta }
}


const $itemLoading = $text(style({ color: theme.system }))('loading...')


export const $QuantumScroll = ({ maxContainerHeight, rowHeight, dataSource, threshold = 10, containerStyle = {}, $loading = $itemLoading }: QuantumScroll) => component((
  [sampleScroll, scroll]: Behavior<IBranch, ScrollSegment>,
) => {

  const multicastedData = multicast(dataSource)
  const initalPage = getPageRequest(0, maxContainerHeight, rowHeight, threshold)
  const scrollWithInitial: Stream<ScrollSegment> = multicast(startWith(initalPage, scroll))


  const $requestAndLoader: Stream<$Branch[]> = merge(
    delay(1, map(res => res.$items, multicastedData)),
    map((scroll) => Array(scroll.delta).fill($loading), scrollWithInitial),
  )
  const $skipRepaintingLoader = skipRepeatsWith((prev, next) => {
    return next[0] === prev[0]
  }, $requestAndLoader)

  const $intermissionedItems = switchLatest(
    map(l => mergeArray(l), $skipRepaintingLoader)
  )

  const $container = $column(
    style({ maxHeight: maxContainerHeight + 'px', display: 'block', overflow: 'auto', ...containerStyle }),
    designSheet.customScroll,
    sampleScroll(
      event('scroll'),
      map(ev => {
        const target = ev.target
        if (!(target instanceof HTMLElement)) {
          throw new Error('element target is not scrollable')
        }
        return getPageRequest(target.scrollTop, target.clientHeight, rowHeight, threshold)
      }),
      skipRepeatsWith((prev, next) => prev.from === next.from),
    )
  )

  const $content = $node(
    style({
      display: 'block', position: 'relative', overflow: 'hidden', width: '100%', minHeight: '100%',
    }),
    styleInline(
      map(x => ({ height: `${rowHeight * x.totalItems}px` }), multicastedData)
    )
  )

  const $list = $column(
    styleInline(
      map(loc => ({ transform: `translate(0, ${loc.from * rowHeight}px)` }), scrollWithInitial)
    ),
    style({ willChange: 'transform' })
  )

  return [
    $container(
      $content(
        $list(
          style({ height: rowHeight + 'px' }, $intermissionedItems)
        )
      )
    ),

    {
      scroll: scrollWithInitial
    }
  ]
})