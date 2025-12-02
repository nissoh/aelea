import type { I$Node, INode } from '@/ui'
import { $svg, attr, style } from '@/ui'
import { type IOps, o } from '@/stream'

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
  svgOps = o()
}: Icon) => $svg('svg')(attr({ viewBox, fill }), style({ width, height }), svgOps)($content)
