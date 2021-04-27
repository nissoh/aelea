import { $text, Behavior, component, style } from "@aelea/core"
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
  [samplePop, pop]: Behavior<any, any>,
  [samplePopCard, popCard]: Behavior<any, any>,
  [sampleCountUp, countUp]: Behavior<1, 1>,
  [sampleCountDown, countDown]: Behavior<-1, -1>
) => {

  const count = merge(countUp, countDown)

  const $popContent = $column(layoutSheet.spacing)(
    $text('Well, hello $Counter component!'),
    $row(style({ placeContent: 'center' }))(
      $Counter({ value: scan((s, n) => s + n, 0, count) })({ decrement: sampleCountDown(), increment: sampleCountUp() })
    )
  )
  const $$popContent = constant($popContent, pop)
  const $$popContentCard = constant($popContent, popCard)


  return [
    $column(layoutSheet.spacing)(
      $text(`Shows extra details with visible and actionable context in a floating buddle`),
      $row(layoutSheet.spacing)(
        $text('This button is a target(context)'),
        $Popover({ $$popContent })(
          $Button({ $content: $text('Pop!') })({
            click: samplePop()
          })
        )({}),
      ),
      $Popover({ $$popContent: $$popContentCard })(
        $column(style({ backgroundColor: pallete.background, border: `1px solid ${pallete.horizon}`, padding: '30px' }))(
          $row(layoutSheet.spacing)(
            $TextField({ label: 'Example', value: now('') })({}),
            $TextField({ label: 'Example', value: now('') })({}),
            $Button({ $content: $text('Advanced') })({
              click: samplePopCard()
            })
          )
        )
      )({})
    )
  ]
})