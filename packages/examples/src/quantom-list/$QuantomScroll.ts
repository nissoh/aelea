
import { component, Behavior, $node, NodeStream, event, NodeChild, style, Op, attr } from 'fufu'
import { map, mergeArray, switchLatest, multicast, skipRepeatsWith, startWith, debounce } from "@most/core"
import { $column } from '../common/common';


export interface QuantomScrollLocation {
    from: number
    to: number

    totalItems: number,
}

export interface QuantomScrollFeedback {
    $items: NodeStream[]
    totalItems: number,
}

export interface QuantomScroll {
    requestItemsOp: Op<QuantomScrollLocation, QuantomScrollFeedback>
    // pageSize: number
    threashold?: number
    rowHeight: number
    maxContainerHeight: number
}

const containerStyle = style({
    display: 'block', overflow: 'auto'
})

const scrollerStyle = style({
    display: 'block', position: 'relative', overflow: 'hidden', width: '100%', minHeight: '100%',
})

const contentStyle = style({
    position: 'absolute', top: 0, left: 0, height: '100%', width: '100%', overflow: 'visible'
})

export default ({ maxContainerHeight, rowHeight, requestItemsOp, threashold = 10 }: QuantomScroll) => component((
    [samplePosition, position]: Behavior<NodeChild, QuantomScrollLocation>,
) => {

    const multicatedLocation = multicast(position)

    const scrollBehavior = samplePosition(
        event('scroll'),
        // debounce(60),
        // merge(containerHeight),
        map(ev => {
            if (ev.target instanceof HTMLElement) {
                return ev.target
            }

            throw new Error('non target el')
        }),
        map(target => {
            const scrollTop = target.scrollTop
            const height = target.clientHeight

            return { scrollTop, height }
        }),
        map(({ scrollTop, height }) => {
            // first visible item index
            let from = Math.floor(scrollTop / rowHeight);

            let visibleRowCount = Math.floor(height / rowHeight);

            // Spanned items
            if (threashold) {
                from = Math.max(0, from - (from % threashold));
                visibleRowCount += threashold;
            }

            // last visible + overscan row index
            const to = from + visibleRowCount;

            return { from, to } as QuantomScrollLocation
        }),
        startWith({ from: 0, to: Math.floor(maxContainerHeight / rowHeight) + threashold }),
        skipRepeatsWith((prev, next) =>
            prev.from === next.from || prev.to === next.to
        ),
    )

    const $multicatedItems = multicast(requestItemsOp(multicatedLocation))

    const $quantomElements = switchLatest(
        map($nodes => mergeArray($nodes.$items), $multicatedItems)
    )

    const contentTop = attr(
        map(loc => ({ style: `transform: translate(0, ${loc.from * rowHeight}px);` }), multicatedLocation)
    )

    const heightStyle = attr(
        map(x => {
            const height = rowHeight * x.totalItems

            return { style: `height:${height}px;` }
        }, $multicatedItems)
    )

    return [
        $column(containerStyle, style({ maxHeight: maxContainerHeight + 'px' }), scrollBehavior)(
            $node(heightStyle, scrollerStyle)(
                $column(contentStyle, contentTop)(
                    style({ height: rowHeight + 'px' }, $quantomElements)
                )
            )
        ),

        { location: position }
    ]
})