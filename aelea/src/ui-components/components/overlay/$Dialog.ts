import { combine, empty, type IOps, type IStream, map, merge, op, start, switchMap } from '../../../stream/index.js'
import { animationFrame, type IBehavior } from '../../../stream-extended/index.js'
import {
  $node,
  attr,
  component,
  effectRun,
  fromEventTarget,
  type I$Node,
  type INode,
  type INodeCompose,
  type IStyleCSS,
  style,
  styleInline
} from '../../../ui-renderer-dom/index.js'
import { observer } from '../../utils/elementObservers.js'

export type IDialogPosition = (anchorEl: HTMLElement, contentEl: HTMLElement) => IStyleCSS

export interface IDialog {
  $anchor: I$Node
  $content: IStream<I$Node | null>
  position: IDialogPosition
  $container?: INodeCompose
  $contentContainer?: INodeCompose
}

export const showPopover = (el: unknown): Disposable | void => {
  const node = el as HTMLElement
  if (typeof node.showPopover !== 'function') return
  try {
    node.showPopover()
  } catch {
    return
  }
  return {
    [Symbol.dispose]() {
      if (node.matches?.(':popover-open')) {
        try {
          node.hidePopover()
        } catch {}
      }
    }
  }
}

export const $Dialog = ({
  $anchor,
  $content,
  position,
  $container = $node,
  $contentContainer = $node
}: IDialog): I$Node =>
  component(
    (
      [anchorEntry, anchorTether]: IBehavior<INode<HTMLElement>, IntersectionObserverEntry[]>,
      [contentEntry, contentTether]: IBehavior<INode<HTMLElement>, IntersectionObserverEntry[]>
    ) => {
      const reposition = merge(
        fromEventTarget(window, 'scroll', { capture: true }),
        fromEventTarget(window, 'resize'),
        animationFrame()
      )

      const $observedAnchor = op(
        $anchor,
        anchorTether(observer.intersection() as IOps<INode<HTMLElement>, IntersectionObserverEntry[]>)
      )

      const $contentSlot = switchMap($body => {
        if (!$body) return empty
        return $contentContainer(
          attr({ popover: 'manual' }),
          style({
            position: 'fixed',
            visibility: 'hidden',
            border: 'none',
            margin: 0,
            color: 'inherit'
          }),
          effectRun(showPopover),
          contentTether(observer.intersection() as IOps<INode<HTMLElement>, IntersectionObserverEntry[]>),
          styleInline(
            map(
              ({ aEntry, cEntry }) => {
                const aEl = aEntry[0]?.target as HTMLElement | undefined
                const cEl = cEntry[0]?.target as HTMLElement | undefined
                if (!aEl || !cEl) return {}
                return { ...position(aEl, cEl), visibility: 'visible' }
              },
              combine({ aEntry: anchorEntry, cEntry: contentEntry, _: start(null, reposition) })
            )
          )
        )($body)
      }, $content)

      return [$container($observedAnchor, $contentSlot), {}]
    }
  )({})
