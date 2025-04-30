import { Behavior } from '@aelea/core'
import { $text, component, style } from '@aelea/dom'
import { $Button, $column, $Popover, $row, $TextField, layoutSheet } from "@aelea/ui-components"
import { pallete } from "@aelea/ui-components-theme"
import { constant, merge, now, scan } from "@most/core"
import $Counter from "../count-counters/$Counter"


export function hexAlpha(color: string, opacity: number): string {
  // coerce values so ti is between 0 and 1.
  const _opacity = Math.round(Math.min(Math.max(opacity || 1, 0), 1) * 255)
  return color + _opacity.toString(16).toUpperCase()
}

export const $PopoverExample = component((
  [pop, popTether]: Behavior<any, any>,
  [popCard, popCardTether]: Behavior<any, any>,
  [popCardBottom, popCardBottomTether]: Behavior<any, any>,
  [countUp, countUpTether]: Behavior<1, 1>,
  [countDown, countDownTether]: Behavior<-1, -1>
) => {

  const count = merge(countUp, countDown)

  const $popContent = $column(spacing.spacing)(
    $text('Well, hello $Counter component!'),
    $row(style({ placeContent: 'center' }))(
      $Counter({ value: scan((s, n) => s + n, 0, count) })({ decrement: countDownTether(), increment: countUpTether() })
    )
  )
  const $$popContent = constant($popContent, pop)
  const $$popContentCard = constant($popContent, popCard)
  const $$popContentCardBottom = constant($popContent, popCardBottom)


  return [
    $column(spacing.spacing)(
      $text(`Shows extra details with visible and actionable context in a floating buddle`),
      $row(spacing.spacing)(
        $text('This button is a target(context)'),
        $Popover({ $$popContent })(
          $Button({ $content: $text('Pop!') })({
            click: popTether()
          })
        )({}),
      ),
      
      $Popover({ $$popContent: $$popContentCard })(
        $column(style({ backgroundColor: pallete.background, border: `1px solid ${pallete.horizon}`, padding: '30px' }))(
          $row(spacing.spacing)(
            $TextField({ label: 'One', value: now('') })({}),
            $TextField({ label: 'Two', value: now('') })({}),
            $Button({ $content: $text('Advanced') })({
              click: popCardTether()
            })
          )
        )
      )({}),


      $column(style({ height: 'calc(100vh / 3)' }))(
        $text('scroll down')
      ),

      $Popover({ $$popContent: $$popContentCardBottom })(
        $column(style({ backgroundColor: pallete.background, border: `1px solid ${pallete.horizon}`, padding: '30px' }))(
          $row(spacing.spacing)(
            $TextField({ label: 'One', value: now('') })({}),
            $TextField({ label: 'Two', value: now('') })({}),
            $Button({ $content: $text('Advanced') })({
              click: popCardBottomTether()
            })
          )
        )
      )({}),

      $column(style({ height: '100vh' }))(
        $text('scroll down')
      ),

    )
  ]
})