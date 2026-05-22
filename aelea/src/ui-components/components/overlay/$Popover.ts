import {
  combine,
  constant,
  empty,
  filter,
  type IOps,
  type IStream,
  map,
  merge,
  never,
  op,
  skipRepeats,
  start,
  switchMap
} from '../../../stream/index.js'
import { animationFrame, type IBehavior, multicast } from '../../../stream-extended/index.js'
import { colorWeight, palette } from '../../../ui-components-theme/index.js'
import {
  $node,
  attr,
  component,
  effectRun,
  fromEventTarget,
  type I$Node,
  type INode,
  type INodeCompose,
  nodeEvent,
  style,
  styleInline
} from '../../../ui-renderer-dom/index.js'
import { $column } from '../../elements/$elements.js'
import { observer } from '../../utils/elementObservers.js'
import { showPopover } from '../../utils/popover.js'
import { isDesktopScreen } from '../../utils/screenUtils.js'
import { disabledOp, isDisabled, resolveDisabledState } from '../controllers/form.js'
import type { Control } from '../controllers/types.js'

const showOverlay = (el: unknown): Disposable | void => {
  const dispose = showPopover(el)
  if (!dispose) return
  const node = el as HTMLElement
  node.style.pointerEvents = 'none'
  const enable = setTimeout(() => {
    node.style.pointerEvents = ''
  }, 100)
  return {
    [Symbol.dispose]() {
      clearTimeout(enable)
      dispose[Symbol.dispose]()
    }
  }
}

export const $defaultPopoverContentContainer = $column(
  style({
    backgroundColor: palette.middleground,
    padding: isDesktopScreen ? '28px' : '16px',
    borderRadius: '24px',
    border: `1px solid ${colorWeight(palette.foreground, 15)}`,
    boxShadow: `0 0 10px 0 ${palette.shadow}`,
    maxWidth: 'calc(100vw - 20px)'
  })
)

export interface I$Popover extends Control {
  $open: IStream<I$Node>
  $target: I$Node
  dismiss?: IStream<unknown>
  spacing?: number
  $contentContainer?: INodeCompose
  $container?: INodeCompose
}

export const $Popover = ({
  $open,
  $target,
  $contentContainer = $defaultPopoverContentContainer,
  $container = $node,
  dismiss = empty,
  disabled = never,
  spacing = 10
}: I$Popover) =>
  component(
    (
      [overlayClick, overlayClickTether]: IBehavior<INode, false>,
      [anchorEntry, anchorTether]: IBehavior<INode<HTMLElement>, IntersectionObserverEntry[]>,
      [contentEntry, contentTether]: IBehavior<INode<HTMLElement>, IntersectionObserverEntry[]>
    ) => {
      const isDisabledStream = multicast(map(isDisabled, resolveDisabledState(disabled)))
      const closeOnDisable = filter(d => d, isDisabledStream)
      const dismissEvent = merge(overlayClick, dismiss, closeOnDisable)
      const openContent = multicast(merge($open, constant(null, dismissEvent)))
      const isOpen = multicast(skipRepeats(map(c => c !== null, openContent)))

      const reposition = merge(
        fromEventTarget(window, 'scroll', { capture: true }),
        fromEventTarget(window, 'resize'),
        animationFrame()
      )

      const $observedAnchor = op(
        $target,
        anchorTether(observer.intersection() as IOps<INode<HTMLElement>, IntersectionObserverEntry[]>)
      )

      const $backdrop = switchMap(
        open =>
          open
            ? $node(
                attr({ popover: 'manual' }),
                style({
                  position: 'fixed',
                  inset: 0,
                  width: '100vw',
                  height: '100vh',
                  backgroundColor: `color-mix(in srgb, ${palette.horizon} 85%, transparent)`,
                  border: 'none',
                  margin: 0,
                  padding: 0
                }),
                styleInline(
                  map(
                    ({ aEntry }) => {
                      const aEl = aEntry[0]?.target as HTMLElement | undefined
                      if (!aEl) return {}
                      const r = aEl.getBoundingClientRect()
                      return {
                        clipPath: `polygon(0 0, 100vw 0, 100vw 100vh, 0 100vh, 0 0, ${r.left}px ${r.top}px, ${r.left}px ${r.bottom}px, ${r.right}px ${r.bottom}px, ${r.right}px ${r.top}px, ${r.left}px ${r.top}px, 0 0)`
                      }
                    },
                    combine({ aEntry: anchorEntry, _: start(null, reposition) })
                  )
                ),
                effectRun(showOverlay),
                overlayClickTether(nodeEvent('click'), constant(false))
              )()
            : empty,
        isOpen
      )

      const $content = switchMap($body => {
        if (!$body) return empty
        return $contentContainer(
          attr({ popover: 'manual' }),
          style({
            position: 'fixed',
            visibility: 'hidden',
            border: 'none',
            margin: 0,
            color: 'inherit',
            overflow: 'visible'
          }),
          effectRun(showPopover),
          contentTether(observer.intersection() as IOps<INode<HTMLElement>, IntersectionObserverEntry[]>),
          styleInline(
            map(
              ({ aEntry, cEntry }) => {
                const aEl = aEntry[0]?.target as HTMLElement | undefined
                const cEl = cEntry[0]?.target as HTMLElement | undefined
                if (!aEl || !cEl) return {}
                const rect = aEl.getBoundingClientRect()
                const bottomSpace = window.innerHeight - rect.bottom
                const goDown = bottomSpace > 200 || bottomSpace > rect.top
                const centerX = rect.left + rect.width / 2
                return {
                  top: `${goDown ? rect.bottom + spacing : rect.top - spacing}px`,
                  left: `clamp(${spacing}px, ${centerX}px, calc(100vw - ${spacing}px))`,
                  transform: `translate(-50%, ${goDown ? '0' : '-100%'})`,
                  visibility: 'visible'
                }
              },
              combine({ aEntry: anchorEntry, cEntry: contentEntry, _: start(null, reposition) })
            )
          )
        )($body)
      }, openContent)

      return [$container(disabledOp(disabled))($observedAnchor, $backdrop, $content), { dismiss: dismissEvent }]
    }
  )
