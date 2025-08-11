import {
  combine,
  constant,
  empty,
  type IStream,
  map,
  merge,
  startWith,
  switchLatest,
  until
} from '../../../stream/index.js'
import { type IBehavior, multicast } from '../../../stream-extended/index.js'
import {
  $node,
  component,
  eventElementTarget,
  type I$Node,
  type INode,
  type INodeCompose,
  nodeEvent,
  style,
  styleBehavior,
  styleInline
} from '../../../ui/index.js'

import { colorAlpha } from '../../../ui-components-theme/color.js'
import { pallete } from '../../../ui-components-theme/globalState.js'
import { $column } from '../../elements/$elements.js'
import { observer } from '../../utils/elementObservers.js'
import { isDesktopScreen } from '../../utils/screenUtils.js'

export const $defaultPopoverContentContainer = $column(
  style({
    backgroundColor: pallete.middleground,
    padding: isDesktopScreen ? '36px' : '16px',
    borderRadius: '24px',
    border: `1px solid ${colorAlpha(pallete.foreground, 0.15)}`,
    boxShadow: `0 0 10px 0 ${colorAlpha(pallete.background, 0.5)}`
  })
)

interface IPocus {
  $open: IStream<I$Node>
  $target: I$Node

  dismiss?: IStream<any>
  spacing?: number
  $contentContainer?: INodeCompose
  $container?: INodeCompose
}

export const $Popover = ({
  $open: open,
  $target,
  $contentContainer = $defaultPopoverContentContainer,
  $container = $node,
  dismiss = empty,
  spacing = 10
}: IPocus) =>
  component(
    (
      [overlayClick, overlayClickTether]: IBehavior<INode, false>,
      [targetIntersection, targetIntersectionTether]: IBehavior<INode, IntersectionObserverEntry[]>
    ) => {
      const openMulticast = multicast(open)
      const dismissEvent = merge(overlayClick, dismiss)

      let targetElement: HTMLElement | null = null

      // Update events stream
      const updateEvents = merge(
        eventElementTarget('scroll', window, { capture: true }),
        eventElementTarget('resize', window)
      )

      const $overlay = $node(
        style({
          position: 'fixed',
          zIndex: 2321,
          backgroundColor: colorAlpha(pallete.horizon, 0.85),
          inset: 0
        }),
        overlayClickTether(nodeEvent('pointerdown'), constant(false))
      )

      const $content = switchLatest(
        map(content => {
          const contentWithPosition = $contentContainer(
            style({ position: 'fixed', zIndex: 3456 }),
            styleInline(
              map(
                ({ targetIntersection, updateEvent }) => {
                  const [entry] = targetIntersection

                  // Store target element for scroll updates
                  if (entry?.target) {
                    targetElement = entry.target as HTMLElement
                  }

                  // Use stored element or entry
                  const el = updateEvent ? targetElement : (entry?.target as HTMLElement)
                  if (!el) return { visibility: 'hidden' }

                  const rect = el.getBoundingClientRect()
                  const bottomSpace = window.innerHeight - rect.bottom
                  const topSpace = rect.top
                  const goDown = bottomSpace > 200 || bottomSpace > topSpace

                  // Center horizontally on the element
                  const centerX = rect.left + rect.width / 2
                  const popoverWidth = 400 // Estimated width
                  const left = Math.max(
                    spacing,
                    Math.min(centerX - popoverWidth / 2, window.innerWidth - popoverWidth - spacing)
                  )

                  return {
                    top: `${goDown ? rect.bottom + spacing : rect.top - spacing}px`,
                    left: `${left}px`,
                    transform: `translate(0, ${goDown ? '0' : '-100%'})`,
                    maxWidth: `${Math.min(400, window.innerWidth - spacing * 2)}px`,
                    visibility: 'visible'
                  }
                },
                combine({
                  targetIntersection,
                  updateEvent: startWith(null, updateEvents)
                })
              )
            )
          )(content)

          return until(dismissEvent, merge(contentWithPosition, $overlay()))
        }, openMulticast)
      )

      // Apply z-index to target when popover is open
      const targetWithZIndex = targetIntersectionTether(observer.intersection())(
        styleBehavior(
          merge(
            map(() => ({ zIndex: 2345, position: 'relative' as const }), openMulticast),
            map(() => null, dismissEvent)
          )
        )($target)
      )

      return [$container(targetWithZIndex, $content), { overlayClick }]
    }
  )
