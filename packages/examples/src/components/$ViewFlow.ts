import { attr, Behavior, component, ContainerDomNode, event, NodeComposeFn, style } from 'fufu';
import { $Node } from 'fufu/src/types';
import { $column } from '../common/common';
import { flex } from '../common/stylesheet';


interface ScrollFlow {
    $$rootCompositon: NodeComposeFn<$Node>
}

export default ({ $$rootCompositon: rootCompositon = $column}: ScrollFlow) => (...$content: $Node[]) => component((
    [sampleScroll, scroll]: Behavior<ContainerDomNode, Event>
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

