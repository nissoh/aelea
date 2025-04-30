import { $Node, $svg, attr, IBranch, style } from '@aelea/dom'
import { O, Op } from '@aelea/core'


interface Icon {
  /**  in pixels */
  width?: string
  height?: string
  viewBox?: string
  fill?: string

  $content: $Node
  svgOps?: Op<IBranch<SVGSVGElement>, IBranch<SVGSVGElement>>
}


export const $icon = ({ $content, width = '24px', height = width, viewBox = `0 0 ${parseInt(width)} ${parseInt(height)}`, fill = 'inherit', svgOps = O() }: Icon) => (
  $svg('svg')(attr({ viewBox, fill }), style({ width, height }), svgOps)(
    $content
  )
)


