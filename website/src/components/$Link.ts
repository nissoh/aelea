import { component, Behavior, O, styleBehavior, StyleCSS, style } from "@aelea/core"
import { IAnchor, $Anchor } from "@aelea/router"
import { combine, tap } from "@most/core"
import { theme } from "@aelea/ui-components-theme"



export interface ILink extends IAnchor {
  styles?: StyleCSS
}

export const $Link = ({ url, route, $content, styles = {} }: ILink) => component((
  [sampleClick, click]: Behavior<string, string>,
  [sampleContains, active]: Behavior<boolean, boolean>,
  [sampleFocus, focus]: Behavior<boolean, boolean>,
) => {

  const anchorOps = O(
    style({
      color: theme.foreground,
      padding: '2px 4px',
      ...styles,
    }),
    styleBehavior(
      combine((isActive, isFocus): StyleCSS | null => {
        return isActive ? { color: theme.primary, cursor: 'default' }
          : isFocus ? { backgroundColor: theme.primary }
            : null
      }, active, focus)
    )
  )

  return [
    anchorOps(
      $Anchor({ $content, url, route })({
        click: sampleClick(),
        focus: sampleFocus(),
        contains: sampleContains()
      })
    ),

    { click, active, focus }
  ]
})