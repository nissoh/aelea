import { $text, Behavior, component, event, INode, O, style } from "@aelea/core"
import { $VirtualScroll, $row, layoutSheet, $icon, ScrollResponse, $column, $TextField, ScrollRequest } from "@aelea/ui-components"
import { pallete } from "@aelea/ui-components-theme"
import { constant, empty, map, multicast, startWith, switchLatest } from "@most/core"
import { Token } from "./types"

function objectValuesContainsText<T>(obj: T, text: string) {
  const match = Object.values(obj).find(value => {
    return typeof value === 'string' && value.toLocaleLowerCase().indexOf(text.toLocaleLowerCase()) !== -1
  })

  return match !== undefined
}

export const $TokenList = <T extends Token>(list: T[]) => component((
  [choose, chooseTether]: Behavior<INode, T>,
  [scrollRequest, scrollRequestTether]: Behavior<ScrollRequest, ScrollRequest>,
  [filterListInput, filterListInputTether]: Behavior<string, string>,

) => {

  const filterWithInitial = startWith('', filterListInput)

  return [
    $column(layoutSheet.spacingBig)(
      $TextField({ label: 'Filter', value: empty() })({
        change: filterListInputTether()
      }),

      switchLatest(
        map(filter =>
          $VirtualScroll({
            containerOps: O(layoutSheet.spacing, style({ width: '300px' })),
            dataSource: map((): ScrollResponse => {
              const $items = list.filter(obj => objectValuesContainsText(obj, filter)).map(token => {
                const changeTokenBehavior = chooseTether(event('click'), constant(token))

                return $row(changeTokenBehavior, layoutSheet.spacing, style({ cursor: 'pointer', alignItems: 'center' }))(
                  $icon({ $content: token.$icon, fill: pallete.message, width: 42, viewBox: '0 0 32 32' }),
                  $column(layoutSheet.flex)(
                    $text(style({ fontWeight: 'bold' }))(token.symbol),
                    $text(style({ fontSize: '75%', color: pallete.foreground }))(token.label)
                  ),
                  $text(token.balance.toLocaleString())
                )
              })

              return { $items, pageSize: 20 }
            }, multicast(scrollRequest))
          })({
            scrollRequest: scrollRequestTether()
          })
        , filterWithInitial)
      )
      
    ),

    { choose }
  ]
})