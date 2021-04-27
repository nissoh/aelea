import { $node, $Node, Behavior, component, event, INode, O, style, styleBehavior } from "@aelea/core"
import { observer } from "@aelea/ui-components"
import { pallete } from "@aelea/ui-components-theme"
import { combine, constant, map, merge, multicast, switchLatest, until } from "@most/core"
import { Stream } from "@most/types"
import { hexAlpha } from "../../utils/color"
import { combineArrayMap } from "../../utils/state"


interface IPocus {
  $$popContent: Stream<$Node>
  offset?: number
  padding?: number

  overlayBackgroundColor?: string
  overlayAlpha?: string
}

export const $Popover = ({ $$popContent, offset = 16, padding = 30, overlayBackgroundColor = pallete.horizon }: IPocus) => ($target: $Node) => component((
  [sampleDismiss, dismiss]: Behavior<any, any>,
  [sampleTargetIntersection, targetIntersection]: Behavior<INode, IntersectionObserverEntry[]>,
  [samplePopoverContentDimension, popoverContentDimension]: Behavior<INode, ResizeObserverEntry[]>,
  [samplePopoverContentIntersection, popoverContentIntersection]: Behavior<INode, IntersectionObserverEntry[]>,
) => {


  const $$popContentMulticast = multicast($$popContent)

  const $overlay = $node(
    style({
      position: 'absolute',
      top: 0, left: 0, right: 0, bottom: 0
    }),
    sampleDismiss(
      event('click')
    ),
    styleBehavior(
      combineArrayMap(([rect], [targetRect], [resize]) => {
        const { y, x } = rect.intersectionRect

        const width = targetRect.contentRect.width // + targetRect.intersectionRect.width
        const height = targetRect.contentRect.height // + targetRect.intersectionRect.height

        const left = x + (resize.intersectionRect.width / 2) + 'px'
        const top = y + offset + (height / 2) + 'px'

        return {
          backgroundImage: `radial-gradient(${(width * 1) + padding}px ${height * 1}px at top ${top} left ${left}, ${pallete.horizon} ${width * .7}px, ${hexAlpha(pallete.background, .45)})`,
          // backdropFilter: 'blur(2px)'
        }
      }, popoverContentIntersection, popoverContentDimension, targetIntersection)
    )
  )

  const contentOps = O(
    samplePopoverContentIntersection(
      observer.intersection(),
    ),
    samplePopoverContentDimension(
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
    style({ zIndex: 1000, position: 'absolute', opacity: 0 }),
  )

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

  const dismissOverlay = until(dismiss)

  const targetOp = O(
    sampleTargetIntersection(
      observer.intersection()
    ),
    styleBehavior(
      merge(
        constant({ zIndex: 1000, position: 'relative' }, $$popContentMulticast),
        constant(null, dismiss)
      )
    )
  )

  return [
    $node(map(node => ({ ...node, insertAscending: true })))(
      targetOp($target),
      $popover,
    ),

    { dismiss }
  ]
})