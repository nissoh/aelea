
import { combine, delay, map, merge, mergeArray, multicast, skipRepeats, skipRepeatsWith, switchLatest } from "@most/core"
import { Stream } from '@most/types'
import { $node, $Branch, Behavior, component, IBranch, style, styleInline, $text, StyleCSS, $Node, event, replayLatest } from '@aelea/core'
import { $column } from '../$elements'
import { theme } from "@aelea/ui-components-theme"
import designSheet from "../style/designSheet"
import { observer } from ".."


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
  dataSource: Stream<ScrollResponse>


  threshold?: number
  $loading?: $Node

  containerStyle?: StyleCSS
  contentStyle?: StyleCSS
}


function getPageRequest(offsetTop: number, containerHeight: number, rowHeight: number, threshold: number): ScrollSegment {

  const top = Math.floor(offsetTop / rowHeight)
  const pageSize = Math.floor((containerHeight / rowHeight) + threshold)

  const from = Math.max(0, top - (top % threshold))
  const to = from + pageSize
  const delta = to - from

  return { from, to, pageSize, delta }
}


const $itemLoading = $text(style({ color: theme.system, padding: '3px 10px' }))('loading...')


export const $QuantumScroll = ({ rowHeight, dataSource, threshold = 10, containerStyle = {}, contentStyle = {}, $loading = $itemLoading }: QuantumScroll) => component((
  [sampleScroll, scroll]: Behavior<IBranch, ScrollSegment>,
  [sampleContainerDimension, containerDimension]: Behavior<IBranch, DOMRectReadOnly>,
) => {

  const multicastedData = multicast(dataSource)
  const initalScrollState = map(rect => getPageRequest(0, rect.height, rowHeight, threshold), containerDimension)
  const requestSource = replayLatest(merge(scroll, initalScrollState))

  const $requestAndLoader: Stream<$Branch[]> = merge(
    delay(1, map(res => res.$items.map($item => style({ height: rowHeight + 'px' }, $item)), multicastedData)),
    map((scroll) => Array(scroll.delta).fill(style({ height: rowHeight + 'px' }, $loading)), requestSource),
  )
  const $skipRepaintingLoader = skipRepeatsWith((prev, next) => {
    return next[0] === prev[0]
  }, $requestAndLoader)

  const $intermissionedItems = switchLatest(
    map(l => mergeArray(l), $skipRepaintingLoader)
  )

  const $container = $column(
    style({ display: 'block', position: 'relative', ...containerStyle }),
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
    ),
    sampleContainerDimension(
      observer.resize(),
      map(dim =>
        dim[0]?.contentRect
      ),
      skipRepeats
    )
  )

  const $content = $node(
    designSheet.customScroll,
    style({
      ...contentStyle,
      display: 'block', overflow: 'auto',
      position: 'absolute', top: '0px', left: '0px', right: '0px', bottom: '0px'
    }),
    // styleInline(map(res => ({ height: res.height + 'px' }), containerDimension))
  )

  const totalItemsCount = skipRepeats(map(x => x.totalItems, multicastedData))

  const $list = $column(
    style({ willChange: 'transform' }),
    styleInline(
      combine((totalItems, loc) => {
        const top = loc.from * rowHeight

        return {
          transform: `translate(0, ${top}px)`,
          height: `${rowHeight * totalItems - top}px`
        }
      }, totalItemsCount, requestSource)
    ),
  )

  
  return [
    $container(
      $content(
        $list(
          $intermissionedItems
        )
      )
    ),

    {
      requestSource
    }
  ]
})