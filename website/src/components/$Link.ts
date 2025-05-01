import { combine } from '@most/core'
import type { Behavior } from 'aelea/core'
import {
  type $Branch,
  $element,
  type IStyleCSS,
  component,
  style,
  styleBehavior,
} from 'aelea/dom'
import { $RouterAnchor, type IAnchor } from 'aelea/router'
import { pallete } from 'aelea/ui-components-theme'

export interface ILink extends Omit<IAnchor, '$anchor'> {
  $content: $Branch<HTMLAnchorElement>
}

const $anchor = $element('a')(
  style({
    color: pallete.message,
  }),
)

export const $Link = ({ url, route, $content, anchorOp }: ILink) =>
  component(
    (
      [click, clickTether]: Behavior<string, string>,
      [active, containsTether]: Behavior<boolean, boolean>,
      [focus, focusTether]: Behavior<boolean, boolean>,
    ) => {
      const $anchorEl = $anchor(
        styleBehavior(
          combine(
            (isActive, isFocus): IStyleCSS | null => {
              return isActive
                ? { color: pallete.primary, cursor: 'default' }
                : isFocus
                  ? { backgroundColor: pallete.primary }
                  : null
            },
            active,
            focus,
          ),
        ),
      )($content)

      return [
        $RouterAnchor({ $anchor: $anchorEl, url, route, anchorOp })({
          click: clickTether(),
          focus: focusTether(),
          contains: containsTether(),
        }),

        { click, active, focus },
      ]
    },
  )
