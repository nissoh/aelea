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
import { animationFrame, type IBehavior, multicast, state } from '../../../stream-extended/index.js'
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
  backdropBorderRadius?: number
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
  spacing = 10,
  backdropBorderRadius = 12
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

      const $backdrop = switchMap(open => {
        if (!open) return empty
        const anchorRect = op(
          combine({ aEntry: anchorEntry, _: start(null, reposition) }),
          map(p => {
            const aEl = p.aEntry[0]?.target as HTMLElement | undefined
            return aEl ? aEl.getBoundingClientRect() : null
          }),
          state()
        )
        return $node(
          attr({ popover: 'manual' }),
          style({
            position: 'fixed',
            inset: 0,
            width: '100vw',
            height: '100vh',
            border: 'none',
            margin: 0,
            padding: 0,
            background: 'transparent',
            opacity: '0',
            transition: 'opacity 220ms cubic-bezier(0.22, 1, 0.36, 1)'
          }),
          styleInline(
            op(
              anchorRect,
              map(() => ({ opacity: '1' }))
            )
          ),
          effectRun(showOverlay),
          overlayClickTether(nodeEvent('click'), constant(false))
        )(
          $node(
            style({
              position: 'fixed',
              pointerEvents: 'none'
            }),
            styleInline(
              op(
                anchorRect,
                map(r => {
                  if (!r) return {}
                  const bleed = 16
                  const dim = `color-mix(in srgb, ${palette.horizon} 85%, transparent)`
                  return {
                    top: `${r.top - bleed}px`,
                    left: `${r.left - bleed}px`,
                    width: `${r.width + bleed * 2}px`,
                    height: `${r.height + bleed * 2}px`,
                    borderRadius: `${backdropBorderRadius}px`,
                    boxShadow: `0 0 0 9999px ${dim}`
                  }
                })
              )
            )
          )()
        )
      }, isOpen)

      const $content = switchMap($body => {
        if (!$body) return empty
        return $contentContainer(
          attr({ popover: 'manual' }),
          style({
            position: 'fixed',
            visibility: 'hidden',
            opacity: '0',
            transform: 'scale(0.96)',
            transformOrigin: 'center top',
            transition: 'opacity 220ms cubic-bezier(0.22, 1, 0.36, 1), transform 220ms cubic-bezier(0.22, 1, 0.36, 1)',
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
                const aRect = aEl.getBoundingClientRect()
                const cRect = cEl.getBoundingClientRect()
                const spaceBelow = window.innerHeight - aRect.bottom
                const spaceAbove = aRect.top
                const goDown = spaceBelow >= spaceAbove
                const centerX = aRect.left + aRect.width / 2
                const desiredLeft = centerX - cRect.width / 2
                const maxLeft = window.innerWidth - cRect.width - spacing
                const left = Math.max(spacing, Math.min(desiredLeft, maxLeft))
                return {
                  top: `${goDown ? aRect.bottom + spacing : aRect.top - spacing - cRect.height}px`,
                  left: `${left}px`,
                  transform: 'scale(1)',
                  transformOrigin: goDown ? 'center top' : 'center bottom',
                  opacity: '1',
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
