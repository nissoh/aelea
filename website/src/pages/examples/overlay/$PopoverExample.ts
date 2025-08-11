import { constant, merge, now, reduce } from 'aelea/stream'
import type { IBehavior } from 'aelea/stream-extended'
import { $text, component, style } from 'aelea/ui'
import { $Button, $column, $Popover, $row, $TextField, spacing } from 'aelea/ui-components'
import { pallete } from 'aelea/ui-components-theme'
import $Counter from '../count-counters/$Counter'

export function hexAlpha(color: string, opacity: number): string {
  // coerce values so ti is between 0 and 1.
  const _opacity = Math.round(Math.min(Math.max(opacity || 1, 0), 1) * 255)
  return color + _opacity.toString(16).toUpperCase()
}

export const $PopoverExample = component(
  (
    [pop, popTether]: IBehavior<any, any>,
    [popCard, popCardTether]: IBehavior<any, any>,
    [popCardBottom, popCardBottomTether]: IBehavior<any, any>,
    [countUp, countUpTether]: IBehavior<1, 1>,
    [countDown, countDownTether]: IBehavior<-1, -1>
  ) => {
    const count = merge(countUp, countDown)

    const $popContent = $column(spacing.default)(
      $text('Well, hello $Counter component!'),
      $row(style({ placeContent: 'center' }))(
        $Counter({ value: reduce((s, n) => s + n, 0, count) })({
          decrement: countDownTether(),
          increment: countUpTether()
        })
      )
    )
    const $$popContent = constant($popContent, pop)
    const $$popContentCard = constant($popContent, popCard)

    return [
      $column(spacing.default)(
        $text('Shows extra details with visible and actionable context in a floating buddle'),
        $row(spacing.default)(
          $text('This button is a target(context)'),
          $Popover({
            $target: $Button({ $content: $text('Pop!') })({
              click: popTether()
            }),
            $open: $$popContent
          })({})
        ),

        $Popover({
          $open: $$popContentCard,
          $target: $column(
            style({
              backgroundColor: pallete.background,
              border: `1px solid ${pallete.horizon}`,
              padding: '30px'
            })
          )(
            $row(spacing.default)(
              $TextField({ label: 'One', value: now('') })({}),
              $TextField({ label: 'Two', value: now('') })({}),
              $Button({ $content: $text('Advanced') })({
                click: popCardTether()
              })
            )
          )
        })({}),

        $column(style({ height: 'calc(100vh / 3)' }))($text('scroll down')),

        $Popover({
          $target: $column(
            style({
              backgroundColor: pallete.background,
              border: `1px solid ${pallete.horizon}`,
              padding: '30px'
            })
          )(
            $row(spacing.default)(
              $TextField({ label: 'One', value: now('') })({}),
              $TextField({ label: 'Two', value: now('') })({}),
              $Button({ $content: $text('Advanced') })({
                click: popCardBottomTether()
              })
            )
          ),
          $open: constant($popContent, popCardBottom)
        })({}),

        $column(style({ height: '100vh' }))($text('scroll down'))
      )
    ]
  }
)
