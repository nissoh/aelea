import { type IStream, switchMap } from '../../stream/index.js'
import { PromiseStatus, promiseState } from '../../stream-extended/index.js'
import { palette, text } from '../../ui-components-theme/index.js'
import { $custom, $svg, $text, attr, type I$Node, style } from '../../ui-renderer-dom/index.js'
import { spacing } from '../style/spacing.js'

export interface IClassifiedError {
  detail: string
}

export const classifyError = (err: unknown): IClassifiedError => {
  if (err instanceof Error) return { detail: err.message }
  if (typeof err === 'string') return { detail: err }
  if (err && typeof err === 'object' && 'message' in err && typeof (err as { message: unknown }).message === 'string') {
    return { detail: (err as { message: string }).message }
  }
  try {
    return { detail: JSON.stringify(err) }
  } catch {
    return { detail: 'Unknown error' }
  }
}

// SMIL `<animateTransform>` instead of CSS `@keyframes` — avoids reaching
// into the renderer's stylesheet for a global rule.
export const $spinner: I$Node = $svg('svg')(
  attr({ viewBox: '0 0 24 24', width: '24', height: '24' }),
  style({ display: 'inline-block', color: palette.message })
)(
  $svg('circle')(
    attr({
      cx: '12',
      cy: '12',
      r: '9',
      fill: 'none',
      stroke: 'currentColor',
      'stroke-width': '2.5',
      'stroke-linecap': 'round',
      'stroke-dasharray': '42 22'
    })
  )(
    $svg('animateTransform')(
      attr({
        attributeName: 'transform',
        type: 'rotate',
        from: '0 12 12',
        to: '360 12 12',
        dur: '0.9s',
        repeatCount: 'indefinite'
      })
    )()
  )
)

export const $alertTooltip = $custom('alert')(
  spacing.small,
  style({
    display: 'inline-flex',
    alignItems: 'center',
    padding: '6px 10px',
    borderRadius: '4px',
    color: palette.negative,
    border: `1px solid ${palette.negative}`,
    background: palette.background,
    fontSize: text.sm
  })
)

export interface I$IntermediatePromise<T> {
  $display: IStream<Promise<T>>
  $loader?: I$Node
  $$fail?: (error: unknown) => I$Node
}

const defaultFail = (err: unknown): I$Node => {
  const detail = classifyError(err).detail
  return style({ placeSelf: 'center', margin: 'auto' }, $alertTooltip($text(detail)))
}

export const $intermediatePromise = <T extends I$Node>({
  $loader = $spinner,
  $$fail = defaultFail,
  $display
}: I$IntermediatePromise<T>): I$Node =>
  switchMap(state => {
    if (state.status === PromiseStatus.PENDING) return $loader
    if (state.status === PromiseStatus.ERROR) {
      console.error(state.error)
      return $$fail(state.error)
    }
    return state.value
  }, promiseState($display))
