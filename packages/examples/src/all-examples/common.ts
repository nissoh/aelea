import { map } from "@most/core"
import { NodeStream, component, Op, DomNode, attr, event, $element, style } from "fufu"
import * as designSheet from '../common/style/stylesheet'

interface Link {
    href: string,
    $content: NodeStream
}

const $anchor = $element('a')(
    designSheet.btn,
    style({ margin: '6px' }),
)

export const $Link = (props: Link) => component((
    [sampleClick, click]
) => {

    const changeLocationBehavior: Op<DomNode, DomNode> = sampleClick(
        event('click'),
        map((clickEv): string => {
            clickEv.preventDefault()

            const pathName = clickEv.currentTarget instanceof HTMLAnchorElement ? clickEv.currentTarget.pathname : null

            if (pathName) {
                history.pushState(null, '', props.href)
                return pathName
            }

            throw new Error('target anchor contains no href')
        })
    )

    return [
        $anchor(
            attr({ href: props.href }),
            changeLocationBehavior
        )(props.$content),

        { click }
    ]
})
