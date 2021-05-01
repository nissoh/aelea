import { component, Behavior, O, styleBehavior, StyleCSS, style } from "@aelea/core"
import { IAnchor, $Anchor } from "@aelea/router"
import { combine } from "@most/core"
import { pallete } from "@aelea/ui-components-theme"



export interface ILink extends IAnchor {
  styles?: StyleCSS
}

export const $Link = ({ url, route, $content, styles = {} }: ILink) => component((
  [click, clickTether]: Behavior<string, string>,
  [active, containsTether]: Behavior<boolean, boolean>,
  [focus, focusTether]: Behavior<boolean, boolean>,
) => {

  const anchorOps = O(
    style({
      color: pallete.message,
      padding: '2px 4px',
      ...styles,
    }),
    styleBehavior(
      combine((isActive, isFocus): StyleCSS | null => {
        return isActive ? { color: pallete.primary, cursor: 'default' }
          : isFocus ? { backgroundColor: pallete.primary }
            : null
      }, active, focus)
    )
  )

  return [
    anchorOps(
      $Anchor({ $content, url, route })({
        click: clickTether(),
        focus: focusTether(),
        contains: containsTether()
      })
    ),

    { click, active, focus }
  ]
})