import { $text, component, nodeEvent, INode, style } from '@aelea/dom'
import { Behavior, O } from '@aelea/core'
import { $VirtualScroll, layoutSheet, ScrollResponse, $column, $TextField, ScrollRequest } from "@aelea/ui-components"
import { constant, empty, map, multicast, startWith, switchLatest } from "@most/core"
import { $tokenLabel } from "../$elements"
import { Token } from "../types"

function objectValuesContainsText<T>(obj: T, text: string) {
  const match = Object.values(obj).find(value => {
    return typeof value === 'string' && value.toLocaleLowerCase().indexOf(text.toLocaleLowerCase()) !== -1
  })

  return match !== undefined
}

export const $TokenList = <T extends Readonly<Token>>(list: readonly T[]) => component((
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
                const changeTokenBehavior = chooseTether(nodeEvent('click'), constant(token))

                return changeTokenBehavior($tokenLabel(token, $text(token.contract.balanceReadable)))
              })

              return $items
            }, multicast(scrollRequest))
          })({
            scrollIndex: scrollRequestTether()
          })
        , filterWithInitial)
      )
      
    ),

    { choose }
  ]
})