import { $svg, attr, StyleCSS, motion, MOTION_NO_WOBBLE, styleInline, style, $node, $text, $Node } from "@aelea/core"
import { $column, $icon, $row, layoutSheet } from "@aelea/ui-components"
import { pallete } from "@aelea/ui-components-theme"
import { empty, map } from "@most/core"
import { Stream } from "@most/types"
import { Token } from "./types"

const $cryptoIcon = ($content: $Node, size = '32px', viewBox = '0 0 32 32') => $icon({
  $content,
  fill: pallete.message,
  width: size,
  viewBox,
  svgOps: style({
    minWidth: '32px'
  }),
})

const $g = $svg('g')

export const $path = $svg('path')


export const $caretDown = $path(attr({ d: 'M4.616.296c.71.32 1.326.844 2.038 1.163L13.48 4.52a6.105 6.105 0 005.005 0l6.825-3.061c.71-.32 1.328-.84 2.038-1.162l.125-.053A3.308 3.308 0 0128.715 0a3.19 3.19 0 012.296.976c.66.652.989 1.427.989 2.333 0 .906-.33 1.681-.986 2.333L18.498 18.344a3.467 3.467 0 01-1.14.765c-.444.188-.891.291-1.345.314a3.456 3.456 0 01-1.31-.177 2.263 2.263 0 01-1.038-.695L.95 5.64A3.22 3.22 0 010 3.309C0 2.403.317 1.628.95.98c.317-.324.68-.568 1.088-.732a3.308 3.308 0 011.24-.244 3.19 3.19 0 011.338.293z' }))()
export const $caretDblDown = $path(attr({ d: 'M15.97 28.996c-.497 0-.983-.176-1.37-.493L1.77 17.793a2.15 2.15 0 01-.275-3.021 2.142 2.142 0 013.017-.276l11.465 9.6 11.464-9.254a2.143 2.143 0 013.011.311l.006.012a2.14 2.14 0 01-.175 3.022l-.124.106-12.83 10.345c-.41.258-.884.387-1.358.358z M15.97 18.996c-.497 0-.983-.176-1.37-.493L1.77 7.793a2.15 2.15 0 01-.275-3.021 2.142 2.142 0 013.017-.276l11.465 9.6L27.44 4.842a2.143 2.143 0 013.011.311l.006.012a2.14 2.14 0 01-.175 3.022l-.124.106-12.83 10.345c-.41.258-.884.387-1.358.358z' }))()


export const $circle = $path(attr({ d: 'M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831' }))


export const $xrd = $cryptoIcon(
  $path(attr({ d: 'M16 32C7.163 32 0 24.837 0 16S7.163 0 16 0s16 7.163 16 16-7.163 16-16 16zm-3.825-7.457c.175.286.525.457.875.457h.117c.408-.057.7-.286.875-.629l5.891-13.2H26V9h-6.767a1.08 1.08 0 00-.991.629l-5.425 12.114-3.559-4.8c-.175-.286-.525-.457-.875-.457H5v2.171h2.8l4.375 5.886z' }))()
)
export const $usdt = $cryptoIcon(
  $path(attr({ d: 'M16 32C7.163 32 0 24.837 0 16S7.163 0 16 0s16 7.163 16 16-7.163 16-16 16zm1.057-12.972v-5.86h.77c2.545 0 3.172-2.373 3.172-2.373h-6.683c-3.172 0-3.71 2.374-3.71 2.374h3.943v8.817s2.508-.753 2.508-2.958zm7.338 4.566c2.248-2.336 3.11-5.58 2.301-8.683a9.339 9.339 0 00-2.48-4.28c-.108-.106-.216-.214-.342-.32l-.108-.107a2.185 2.185 0 00-.234-.196l-.144-.107-.215-.16-.127-.09a4.15 4.15 0 01-.251-.178l-.163-.106a1.38 1.38 0 00-.215-.125l-.162-.107c-.072-.036-.144-.09-.216-.125l-.162-.09a2.52 2.52 0 00-.234-.106l-.055-.018c.198.16.395.339.575.517a8.75 8.75 0 010 12.427c-4.386 4.35-11.505 4.35-15.893 0-.162-.16-.306-.32-.467-.48l-.126-.143a5.762 5.762 0 01-.27-.339 11.856 11.856 0 002.176 2.995c4.584 4.546 12.026 4.546 16.61 0a.614.614 0 00.202-.18zM10.4 22.386a8.168 8.168 0 01-.576-.517 8.758 8.758 0 010-12.439c4.391-4.354 11.516-4.354 15.907 0 .306.304.593.625.863.964a11.784 11.784 0 00-2.177-2.98c-4.588-4.551-12.038-4.551-16.626 0-.054.053-.108.125-.18.178-3.041 3.177-3.455 7.924-1.025 11.529.954 1.39 2.284 2.55 3.814 3.265z'  }))()
)
export const $eth = $cryptoIcon(
  $g(
    $path(attr({ d: 'M16 32C7.163 32 0 24.837 0 16S7.163 0 16 0s16 7.163 16 16-7.163 16-16 16zm7.994-15.781L16.498 4 9 16.22l7.498 4.353 7.496-4.354zM24 17.616l-7.502 4.351L9 17.617l7.498 10.378L24 17.616z' }))(),
    $path(attr({ 'fill-opacity': '.298', d: 'M16.498 4v8.87l7.497 3.35zm0 17.968v6.027L24 17.616z' }))(),
    $path(attr({ 'fill-opacity': '.801', d: 'M16.498 20.573l7.497-4.353-7.497-3.348z' }))(),
    $path(attr({ 'fill-opacity': '.298', d: 'M9 16.22l7.498 4.353v-7.701z' }))(),
  )
)


export const $sushi = $cryptoIcon(
  $path(attr({ 'fill-rule': 'evenodd', d: 'M16 32c8.837 0 16-7.163 16-16S24.837 0 16 0 0 7.163 0 16s7.163 16 16 16zM13.156 6.023c-1.562-.123-2.77.256-3.396 1.116l-4.302 5.897c-.625.86-.604 2.11.021 3.522.865 1.945 2.865 4.249 5.615 6.174 2.74 1.935 5.604 3.061 7.76 3.245 1.552.123 2.77-.256 3.396-1.116l4.291-5.897c.625-.86.605-2.11-.02-3.522-.854-1.945-2.865-4.249-5.604-6.184-2.75-1.925-5.605-3.061-7.76-3.235zm12.698 9.706c.49 1.126.594 2.13.094 2.805l-.032.051c-.51.645-1.479.86-2.708.768-2.052-.164-4.77-1.26-7.385-3.102-2.615-1.843-4.542-4.024-5.365-5.887-.49-1.106-.593-2.079-.125-2.765l.021-.04c.5-.687 1.49-.912 2.74-.81 2.052.164 4.77 1.26 7.385 3.103 2.625 1.843 4.552 4.024 5.375 5.877zm-3.906-1.26c-.406-.931-1.375-2.027-2.688-2.948-1.302-.922-2.666-1.465-3.687-1.557-.583-.04-1.052.052-1.281.369-.23.317-.167.778.062 1.3.406.932 1.375 2.017 2.688 2.939 1.312.921 2.666 1.474 3.697 1.556.573.051 1.042-.041 1.271-.358.24-.318.177-.778-.062-1.3zM9.484 9.24a.155.155 0 00-.163-.148.155.155 0 00-.15.16l.011.167a.155.155 0 00.168.141.154.154 0 00.144-.165 4.145 4.145 0 01-.01-.155zm.046.465a.156.156 0 00-.178-.13.154.154 0 00-.131.176c.198 1.288.931 2.526 1.848 3.64a.158.158 0 00.22.024.152.152 0 00.023-.216c-.901-1.096-1.596-2.284-1.782-3.494zm4.661 6.323a.158.158 0 00-.22.016.152.152 0 00.016.217l.125.105c.052.044.105.087.159.13a.158.158 0 00.22-.02.152.152 0 00-.021-.216 12.421 12.421 0 01-.155-.128l-.124-.104zm.596.482a.158.158 0 00-.22.027.152.152 0 00.028.215c1.313 1.006 2.906 1.885 4.488 2.514a.157.157 0 00.203-.085.153.153 0 00-.086-.2c-1.558-.619-3.125-1.484-4.413-2.47zm9.576 3.71a.154.154 0 00.13-.176.156.156 0 00-.18-.128c-.063.01-.128.02-.195.027a.157.157 0 00-.112.066.151.151 0 00-.026.103c.01.085.087.145.173.136a4.56 4.56 0 00.21-.028z' }))(),
)

export const $spinner = $node(style({
  margin: '0 auto',
  borderRadius: '50%',
  border: `4px ${pallete.message} dashed`,
  boxShadow: `inset 0px 0px 0px 3px ${pallete.message}`,
  backgroundColor: 'transparent',
  animation: 'spinner 5s linear infinite',
}))

export interface Gauge {
  styleCSS?: StyleCSS
  size?: string
  value: Stream<number>
}

export const $gaugeMetric = ({ value, size = '24px', styleCSS }: Gauge) => {

  const animateChange = motion(MOTION_NO_WOBBLE, 0, value)
  const attrAniamtion = styleInline(map(n => ({
    strokeDasharray: `${n * 100}, 100`,
    stroke: n > 1 ? pallete.negative : ''
  }), animateChange))

  return $svg('svg')(style({ display: 'block', width: size, height: size, ...styleCSS }), attr({ viewBox: '0 0 36 36' }))(
    $circle(style({ fill: 'none', stroke: pallete.middleground, strokeWidth: '3.8' }))(),
    $circle(style({ fill: 'none', stroke: pallete.foreground, strokeWidth: '3.8' }), attrAniamtion)()
  )
}


export const $tokenLabel = (token: Token, $label?: $Node) => {
  return $row(layoutSheet.spacing, style({ cursor: 'pointer', alignItems: 'center' }))(
    token.$icon,
    $column(layoutSheet.flex)(
      $text(style({ fontWeight: 'bold' }))(token.symbol),
      $text(style({ fontSize: '75%', color: pallete.foreground }))(token.label)
    ),
    style({ whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }, $label || empty())
  )
}

export const $labeledDivider = (label: string) => {
  return $row(layoutSheet.spacing, style({ placeContent: 'center', alignItems: 'center' }))(
    $column(style({ flex: 1, borderBottom: `1px solid ${pallete.middleground}` }))(),
    $row(layoutSheet.spacingSmall, style({ color: pallete.foreground, alignItems: 'center' }))(
      $text(style({ fontSize: '75%' }))(label),
      $icon({ $content: $caretDblDown, width: '10px', viewBox: '0 0 32 32', fill: pallete.foreground }),
    ),
    $column(style({ flex: 1, borderBottom: `1px solid ${pallete.middleground}` }))(),
  )
}