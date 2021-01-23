
import { map, mergeArray, multicast, skipRepeatsWith, startWith, switchLatest } from "@most/core"
import { Stream } from '@most/types'
import { $node, $Branch, Behavior, component, event, IBranch, O, replayLatest, style, styleInMotion } from '@aelea/core'
import { $column } from '../common/common'


// function smoothScroll(target = document.documentElement, smooth = 7) {
//     if (!target) throw new Error('no scroll matched')

//     const wheel = eventElementTarget('wheel', target, { passive: false })

//     const scrollPos = switchLatest(
//         map(e => {
//             e.preventDefault(); // disable default scrolling

//             const posY = target.scrollTop + e.deltaY

//             return map(mf => {
//                 const delta = (posY - target.scrollTop) // / smooth
//                 target.scrollTop = target.scrollTop + (delta * mf)
//             })

//         }, wheel)
//     )

//     return scrollPos
// }


export interface ScrollSegment {
    from: number
    to: number
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
    $intermissionItem?: $Branch
}

const containerStyle = style({
    display: 'block', overflow: 'auto'
})

const scrollerStyle = style({
    display: 'block', position: 'relative', overflow: 'hidden', width: '100%', minHeight: '100%',
})



export default ({ maxContainerHeight, rowHeight, dataSource, threshold = 10 }: QuantumScroll) => component((
    [sampleScroll, scroll]: Behavior<IBranch, ScrollSegment>,
) => {

    const scrollBehavior = sampleScroll(
        event('scroll'),
        map(ev => {
            const target = ev.target
            if (!(target instanceof HTMLElement)) {
                throw new Error('element target is not scrollable')
            }

            const top = Math.floor(target.scrollTop / rowHeight)
            const pageSize = Math.floor((target.clientHeight / rowHeight) + threshold)

            const from = Math.max(0, top - (top % threshold))
            const to = from + pageSize

            return { from, to, pageSize }
        }),
        skipRepeatsWith((prev, next) => prev.from === next.from),
    )

    const intialPageSize = Math.floor(maxContainerHeight / rowHeight) + threshold
    const multicatedScroll: Stream<ScrollSegment> = startWith({ from: 0, to: intialPageSize, pageSize: intialPageSize }, multicast(scroll))

    const multicastedData = replayLatest(multicast(dataSource))

    const $intermissionedItems = O(
        map(({ $items }: ScrollResponse) => mergeArray($items)),
        switchLatest
    )(multicastedData)


    const $container = $column(style({ maxHeight: maxContainerHeight + 'px' }), containerStyle, scrollBehavior)

    const $content = $node(
        styleInMotion(
            map(x => ({ height: `${rowHeight * x.totalItems}px` }), multicastedData)
        ),
        scrollerStyle
    )

    const $innerContent = $column(styleInMotion(map(loc => ({ transform: `translate(0, ${loc.from * rowHeight}px)` }), multicatedScroll)), style({ willChange: 'transform' }))

    return [
        $container(
            $content(
                $innerContent(
                    style({ height: rowHeight + 'px' }, $intermissionedItems)
                )
            )
        ),

        {
            scroll: multicatedScroll
        }
    ]
})