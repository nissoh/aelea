import { type IOps, op } from '../../stream/index.js'
import type { I$Node, INode } from '../../ui-renderer-dom/index.js'
import { $svg, attr, style } from '../../ui-renderer-dom/index.js'

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
  viewBox = `0 0 ${Number.parseInt(width, 10)} ${Number.parseInt(height, 10)}`,
  fill = 'inherit',
  svgOps = op
}: Icon) => $svg('svg')(attr({ viewBox, fill }), style({ width, height }), svgOps)($content)
