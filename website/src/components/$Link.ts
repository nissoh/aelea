import { combineMap, op } from 'aelea/stream'
import type { IBehavior } from 'aelea/stream-extended'
import type { I$Slottable, IStyleCSS } from 'aelea/ui'
import { $element, component, style, styleBehavior } from 'aelea/ui'
import { pallete } from 'aelea/ui-components-theme'
import { $Link as $RouterLink, type IAnchor, isContaining } from 'aelea/ui-router'

export interface ILink extends Omit<IAnchor, '$anchor'> {
  $content: I$Slottable
}

const $anchor = $element('a')(
  style({
    color: pallete.message
  })
)

export const $Link = ({ route, $content, params }: ILink) =>
  component(([focus, focusTether]: IBehavior<boolean, boolean>) => {
    const active = isContaining(route)
    const $anchorEl = $anchor(
      styleBehavior(
        combineMap(
          (isActive, isFocus): IStyleCSS | null =>
            isActive
              ? { color: pallete.primary, cursor: 'default' }
              : isFocus
                ? { backgroundColor: pallete.primary }
                : null,
          active,
          focus
        )
      )
    )($content)

    return [
      $RouterLink({ route, params, $anchor: $anchorEl })({
        focus: focusTether(),
        click: op
      }),

      { active, focus }
    ]
  })
