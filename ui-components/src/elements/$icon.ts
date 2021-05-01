import { $Node, $svg, attr, style } from "@aelea/core"
import { pallete } from "@aelea/ui-components-theme"


interface Icon {
  width?: number // in pixels
  height?: number // in pixels
  $content: $Node
  viewBox?: string
  fill?: string
}


export const $icon = ({ $content, width = 24, height = width, viewBox = `0 0 ${width} ${height}`, fill = 'inherit' }: Icon) => (
  $svg('svg')(attr({ viewBox, width, height }), style({ fill }))(
    $content
  )
)


