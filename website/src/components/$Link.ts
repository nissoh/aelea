import { combine } from '@most/core'
import type { I$Slottable, IBehavior, IStyleCSS } from 'aelea/core'
import { $element, component, style, styleBehavior } from 'aelea/core'
import { $RouterAnchor, type IAnchor } from 'aelea/router'
import { pallete } from 'aelea/ui-components-theme'

export interface ILink extends Omit<IAnchor, '$anchor'> {
  $content: I$Slottable
}

const $anchor = $element('a')(
  style({
    color: pallete.message
  })
)

export const $Link = ({ url, route, $content, anchorOp }: ILink) =>
  component(
    (
      [click, clickTether]: IBehavior<string, string>,
      [active, containsTether]: IBehavior<boolean, boolean>,
      [focus, focusTether]: IBehavior<boolean, boolean>
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
            focus
          )
        )
      )($content)

      return [
        $RouterAnchor({ $anchor: $anchorEl, url, route, anchorOp })({
          click: clickTether(),
          focus: focusTether(),
          contains: containsTether()
        }),

        { click, active, focus }
      ]
    }
  )
