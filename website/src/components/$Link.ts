import { combine } from "@most/core"
import { $element, style, component, styleBehavior } from "aelea/core"
import { $Node, Behavior, IStyleCSS } from "aelea/core-types"
import { IAnchor, $RouterAnchor } from "aelea/router"
import { pallete } from "aelea/ui-components-theme"

export interface ILink extends Omit<IAnchor, '$anchor'> {
  $content: $Node
}

const $anchor = $element('a')(
  style({
    color: pallete.message
  })
)

export const $Link = ({ url, route, $content, anchorOp }: ILink) =>
  component(
    (
      [click, clickTether]: Behavior<string, string>,
      [active, containsTether]: Behavior<boolean, boolean>,
      [focus, focusTether]: Behavior<boolean, boolean>
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
