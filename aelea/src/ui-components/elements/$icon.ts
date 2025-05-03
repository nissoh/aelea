import { O } from '../../core/common.js'
import type { IOps } from '../../core/types.js'
import { $svg, attr, style } from '../../core/index.js'
import type { $Node } from '../../core/source/node.js'
import type { IBranch } from '../../core/source/node.js'

interface Icon {
  /**  in pixels */
  width?: string
  height?: string
  viewBox?: string
  fill?: string

  $content: $Node
  svgOps?: IOps<IBranch<SVGSVGElement>, IBranch<SVGSVGElement>>
}

export const $icon = ({
  $content,
  width = '24px',
  height = width,
  viewBox = `0 0 ${Number.parseInt(width)} ${Number.parseInt(height)}`,
  fill = 'inherit',
  svgOps = O()
}: Icon) => $svg('svg')(attr({ viewBox, fill }), style({ width, height }), svgOps)($content)
