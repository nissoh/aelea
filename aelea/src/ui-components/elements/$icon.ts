import { $svg, attr, style } from '../../core/index.js'
import type { I$Node, INode } from '../../core/types.js'
import { type IOps, o } from '../../stream/index.js'

interface Icon {
  /**  in pixels */
  width?: string
  height?: string
  viewBox?: string
  fill?: string

  $content: I$Node
  svgOps?: IOps<INode<SVGSVGElement>>
}

export const $icon = ({
  $content,
  width = '24px',
  height = width,
  viewBox = `0 0 ${Number.parseInt(width)} ${Number.parseInt(height)}`,
  fill = 'inherit',
  svgOps = o()
}: Icon) => $svg('svg')(attr({ viewBox, fill }), style({ width, height }), svgOps)($content)
