import { $node, $Node, Behavior, component, event, INode, O, style, styleBehavior } from "@aelea/core"
import { pallete } from "@aelea/ui-components-theme"
import { constant, empty, map, merge, multicast, never, switchLatest, until } from "@most/core"
import { Stream } from "@most/types"
import { observer } from "../.."
import { hexAlpha } from "../../utils/color"
import { combineArrayMap } from "../../utils/state"


interface IPocus {
  $$popContent: Stream<$Node>
  offset?: number
  padding?: number
  dismiss?: Stream<any>

  // overlayBackgroundColor?: string
  // overlayAlpha?: string
}

export const $Popover = ({ $$popContent, offset = 16, padding = 24, dismiss = empty() }: IPocus) => ($target: $Node) => component((
  [overlayClick, overlayClickTether]: Behavior<any, any>,
  [targetIntersection, targetIntersectionTether]: Behavior<INode, IntersectionObserverEntry[]>,
  [popoverContentDimension, popoverContentDimensionTether]: Behavior<INode, ResizeObserverEntry[]>,
  [popoverContentIntersection, popoverContentIntersectionTether]: Behavior<INode, IntersectionObserverEntry[]>,
) => {


  const $$popContentMulticast = multicast($$popContent)

  const $overlay = $node(
    style({
      position: 'absolute', zIndex: 99999,
      top: 0, left: 0, right: 0, bottom: 0
    }),
    overlayClickTether(
      event('click')
    ),
    styleBehavior(
      combineArrayMap(([contentResize], [intersectionContentRect], [IntersectiontargetRect]) => {
        const { y, x } = IntersectiontargetRect.intersectionRect

        const width = Math.max(contentResize.contentRect.width, IntersectiontargetRect.intersectionRect.width) + (padding * 2) + offset
        const height = contentResize.contentRect.height + IntersectiontargetRect.intersectionRect.height + offset + padding * 2

        const left = x + (IntersectiontargetRect.intersectionRect.width / 2) + 'px'
        const top = y - padding + (height / 2) + 'px'


        return {
          backgroundImage: `radial-gradient(${width}px ${height}px at top ${top} left ${left}, ${pallete.background} ${width / 2}px, ${hexAlpha(pallete.horizon, .65)})`,
          // backdropFilter: 'blur(2px)'
        }
      }, popoverContentDimension, popoverContentIntersection, targetIntersection)
    )
  )

  const contentOps = O(
    popoverContentIntersectionTether(
      observer.intersection(),
    ),
    popoverContentDimensionTether(
      observer.resize({ })
    ),
    styleBehavior(
      map(([rect]) => {
        const { y, x, width, bottom } = rect.intersectionRect

        const bottomSpace =  window.innerHeight - bottom
        const topSpace = bottom

        const isUp = bottomSpace > topSpace

        const top = (isUp ? topSpace + offset : y - offset) + 'px'
        const left = x + (width / 2) + 'px'

        return {
          top, left,
          opacity: 1,
          transform: `translate(-50%, ${isUp ? '0': '-100%'})`
        }
      }, targetIntersection)
    ),
    style({ zIndex: 100000, position: 'absolute', opacity: 0 }),
  )

  const dismissOverlay = until(merge(overlayClick, dismiss))


  const $popover = switchLatest(
    map($content => {

      return dismissOverlay(
        merge(
          contentOps($content),
          $overlay(),
        )
      )
    }, $$popContentMulticast)
  )


  const targetOp = O(
    targetIntersectionTether(
      observer.intersection()
    ),
    styleBehavior(
      merge(
        constant({ zIndex: 100000, position: 'relative' }, $$popContentMulticast),
        constant(null, overlayClick)
      )
    )
  )

  return [
    $node(map(node => ({ ...node, insertAscending: true })))(
      targetOp($target),
      $popover,
    ),

    { overlayClick }
  ]
})

