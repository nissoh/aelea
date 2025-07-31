import { $svg, attr, style } from '../../core/index.js'
import type { I$Slottable, INode } from '../../core/source/node.js'
import { o, type IOps } from '../../stream/index.js'

interface Icon {
  /**  in pixels */
  width?: string
  height?: string
  viewBox?: string
  fill?: string

  $content: I$Slottable
  svgOps?: IOps<INode<SVGSVGElement>, INode<SVGSVGElement>>
}

export const $icon = ({
  $content,
  width = '24px',
  height = width,
  viewBox = `0 0 ${Number.parseInt(width)} ${Number.parseInt(height)}`,
  fill = 'inherit',
  svgOps = o()
}: Icon) => $svg('svg')(attr({ viewBox, fill }), style({ width, height }), svgOps)($content)
