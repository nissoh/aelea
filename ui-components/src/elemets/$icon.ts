import { $Node, $svg, attr } from "@aelea/core"
import { theme } from "@aelea/ui-components-theme"



interface Icon {
  width?: number // in pixels
  height?: number // in pixels
  $content: $Node
  viewBox?: string
  fill?: string
}


export const $icon = ({ $content, width = 24, height = width, viewBox = `0 0 ${width} ${height}`, fill = theme.system }: Icon) => (
  $svg('svg')(
    attr({ viewBox, width, height, fill }),
  )($content)
)



