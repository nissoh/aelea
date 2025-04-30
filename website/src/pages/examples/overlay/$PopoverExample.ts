import { constant, map, merge, now, scan, switchLatest } from '@most/core'
import $Counter from '../count-counters/$Counter'
import type { Behavior } from 'aelea/core'
import { component, $text, style } from 'aelea/dom'
import {
  $column,
  spacing,
  $row,
  $Popover,
  $Button,
  $TextField,
} from 'aelea/ui-components'
import { pallete } from '../../../theme'

export function hexAlpha(color: string, opacity: number): string {
  // coerce values so ti is between 0 and 1.
  const _opacity = Math.round(Math.min(Math.max(opacity || 1, 0), 1) * 255)
  return color + _opacity.toString(16).toUpperCase()
}

export const $PopoverExample = component(
  (
    [pop, popTether]: Behavior<any, any>,
    [popCard, popCardTether]: Behavior<any, any>,
    [popCardBottom, popCardBottomTether]: Behavior<any, any>,
    [countUp, countUpTether]: Behavior<1, 1>,
    [countDown, countDownTether]: Behavior<-1, -1>,
  ) => {
    const count = merge(countUp, countDown)

    const $popContent = $column(spacing.default)(
      $text('Well, hello $Counter component!'),
      $row(style({ placeContent: 'center' }))(
        $Counter({ value: scan((s, n) => s + n, 0, count) })({
          decrement: countDownTether(),
          increment: countUpTether(),
        }),
      ),
    )
    const $$popContent = constant($popContent, pop)
    const $$popContentCard = constant($popContent, popCard)

    return [
      $column(spacing.default)(
        $text(
          'Shows extra details with visible and actionable context in a floating buddle',
        ),
        $row(spacing.default)(
          $text('This button is a target(context)'),
          $Popover({
            $target: $Button({ $content: $text('Pop!') })({
              click: popTether(),
            }),
            open: $$popContent,
          })({}),
        ),

        $Popover({
          open: $$popContentCard,
          $target: $column(
            style({
              backgroundColor: pallete.background,
              border: `1px solid ${pallete.horizon}`,
              padding: '30px',
            }),
          )(
            $row(spacing.default)(
              $TextField({ label: 'One', value: now('') })({}),
              $TextField({ label: 'Two', value: now('') })({}),
              $Button({ $content: $text('Advanced') })({
                click: popCardTether(),
              }),
            ),
          ),
        })({}),

        $column(style({ height: 'calc(100vh / 3)' }))($text('scroll down')),

        $Popover({
          $target: $column(
            style({
              backgroundColor: pallete.background,
              border: `1px solid ${pallete.horizon}`,
              padding: '30px',
            }),
          )(
            $row(spacing.default)(
              $TextField({ label: 'One', value: now('') })({}),
              $TextField({ label: 'Two', value: now('') })({}),
              $Button({ $content: $text('Advanced') })({
                click: popCardBottomTether(),
              }),
            ),
          ),
          open: constant($popContent, popCardBottom),
        })({}),

        $column(style({ height: '100vh' }))($text('scroll down')),
      ),
    ]
  },
)
