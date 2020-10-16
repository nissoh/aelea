
import { component, Behavior, $node, event, style, Op, attr, ContainerDomNode, O, $Node, eventElementTarget, motion, nullSink } from 'fufu'
import { map, mergeArray, switchLatest, multicast, startWith, skipRepeatsWith, until, continueWith, skip } from "@most/core"
import { $column } from '../common/common'
import { column, theme } from '../common/stylesheet'
import { Stream } from '@most/types'
import { newDefaultScheduler } from '@most/scheduler'

declare global {
    interface WheelEvent extends MouseEvent {
        wheelDeltaY: number;
    }
}

const isMac = /^Mac/.test(navigator.platform);



function getWheelDirection(e: WheelEvent, n: number) {
    if (isMac) {
        return e.wheelDeltaY < 0 ? -n : Math.abs(n)
    }
    return e.deltaY
}

const clamp = (val: number, min: number, max: number) =>
    val > max ? max
        : val < min ? min
            : val

function smoothScroll(target = document.documentElement, smooth = 7) {

    if (!target) {
        throw new Error('no scroll matched')
    }



    const wheel = eventElementTarget('wheel', target, { passive: false })

    const scrollPos = switchLatest(
        map(e => {
            e.preventDefault(); // disable default scrolling

            const posY = target.scrollTop + e.deltaY

            console.log(posY)

            return map(mf => {
                const delta = (posY - target.scrollTop) // / smooth
                target.scrollTop = target.scrollTop + (delta * mf)
            }, motion({ stiffness: 210, damping: 20 }))

        }, wheel)
    )

    return scrollPos
}

// smoothScroll().run({
//     event(t, v) {

//     },
//     end(t) {

//     },
//     error(t, err) {

//     }
// }, newDefaultScheduler())


export interface Position {
    from: number
    to: number
}

export interface Response {
    $items: $Node[]
    totalItems: number,
}

export interface QuantomScroll {
    rowHeight: number
    maxContainerHeight: number
    queryItemsOp: Op<Position, Stream<Response>>

    threashold?: number
    $intermissionItem?: $Node
}

const containerStyle = style({
    display: 'block', overflow: 'auto'
})

const scrollerStyle = style({
    display: 'block', position: 'relative', overflow: 'hidden', width: '100%', minHeight: '100%',
})


const $intermission = $node(column, style({ placeContent: 'center', alignItems: 'center' }))(
    $node(style({
        width: '100%', height: '2px',
        backgroundRepeat: 'repeat-x',
        backgroundSize: '21px 2px',
        backgroundImage: `linear-gradient(to right, transparent 33%, ${theme.system} 0%)`
    }))()
)

export default ({ maxContainerHeight, rowHeight, queryItemsOp: requestItemsOp, threashold = 10, $intermissionItem }: QuantomScroll) => component((
    [samplePosition, position]: Behavior<ContainerDomNode, Position>,
) => {
    const rowHeightStyle = style({ height: rowHeight + 'px' })

    const scrollBehavior = samplePosition(
        event('scroll'),
        map(ev => {
            const target = ev.target
            if (!(target instanceof HTMLElement)) {
                throw new Error('element target is not scrollable')
            }

            const scrollTop = target.scrollTop
            const height = target.clientHeight

            // first visible item index
            let from = Math.floor(scrollTop / rowHeight)

            let visibleRowCount = Math.floor(height / rowHeight)

            // Spanned items
            if (threashold) {
                from = Math.max(0, from - (from % threashold))
                visibleRowCount += threashold
            }

            // last visible + overscan row index
            const to = from + visibleRowCount

            return { from, to }
        }),
        startWith({ from: 0, to: Math.floor(maxContainerHeight / rowHeight) + threashold }),
        skipRepeatsWith((prev, next) => prev.from === next.from),
    )

    const multicatedPosition = multicast(position)

    const $itemsResponse = O(
        requestItemsOp,
        switchLatest,
        multicast,
    )(position)

    const $intermissionedItems = switchLatest(
        map(resp => {
            const $items = until(
                skip(1, multicatedPosition), // listen to position change, skip the intial
                mergeArray(resp.$items)
            )

            const $intermissionList = Array(resp.$items.length + threashold).fill(null).map(_ => $intermissionItem ?? $intermission)

            const replaceWithLoading = continueWith(() => mergeArray($intermissionList))

            return replaceWithLoading($items)
        }, $itemsResponse)
    )

    const contentTop = attr(
        map(loc => ({ style: `transform: translate(0, ${loc.from * rowHeight}px);` }), multicatedPosition)
    )

    const heightStyle = attr(
        map(x => {
            const height = rowHeight * x.totalItems

            return { style: `height:${height}px;` }
        }, $itemsResponse)
    )

    return [
        $column(containerStyle, style({ maxHeight: maxContainerHeight + 'px' }), scrollBehavior)(
            $node(heightStyle, scrollerStyle)(
                $column(contentTop, style({ willChange: 'transform' }))(
                    rowHeightStyle(
                        $intermissionedItems
                    )
                )
            )
        ),

        {
            position
        }
    ]
})