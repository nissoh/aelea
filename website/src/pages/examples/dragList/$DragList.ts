import { component, Behavior, $Branch, IBranchElement, style, $text } from "@aelea/core"
import { $column, $row, $Sortable, layoutSheet } from "@aelea/ui-components"
import { theme } from "@aelea/ui-components-theme"


export default component(([sampleOrder]: Behavior<$Branch<IBranchElement, {}>[], $Branch<IBranchElement, {}>[]>) => {

  const $list = Array(4).fill(null).map((_, i) =>
    $column(layoutSheet.flex, style({ backgroundColor: theme.middleground, placeContent: 'center', height: '90px', alignItems: 'center' }))(
      $text('node: ' + i)
    )
  )

  return [
    $row(style({ placeContent: 'stretch' }))(
      $Sortable({
        $list,
        itemHeight: 90,
        gap: 10
      })({ orderChange: sampleOrder() })
    )
  ]
})