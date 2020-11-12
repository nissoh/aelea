import { attr, Behavior, component, NodeContainer, event, NodeComposeFn, style } from '@aelea/core';
import { $Node } from '@aelea/core';
import { $column } from '../common/common';
import { flex } from '../common/stylesheet';


interface ScrollFlow {
    $$rootCompositon: NodeComposeFn<$Node>
}

export default ({ $$rootCompositon: rootCompositon = $column}: ScrollFlow) => (...$content: $Node[]) => component((
    [sampleScroll, scroll]: Behavior<NodeContainer, Event>
) => {

    const scrollBehavior = sampleScroll(
        event('wheel')
    )

    const applyScroll = attr(
        scroll
    )


    const containerStyle = style({
        overflowY: 'scroll',
        scrollSnapType: 'y mandatory',
    })

    const itemStyle = style({
        overflowY: 'scroll',
        scrollSnapAlign: 'start',
        height: '100vh'
    })

    return [
        rootCompositon(flex, applyScroll, containerStyle, scrollBehavior)(
            ...$content.map(ns => itemStyle(ns))
        )
    ]
})

