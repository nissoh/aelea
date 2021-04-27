import { $text, Behavior, component, event, INode } from "@aelea/core"
import { $VirtualScroll, $row, layoutSheet, $icon, ScrollResponse } from "@aelea/ui-components"
import { pallete } from "@aelea/ui-components-theme"
import { constant, map } from "@most/core"
import { Token } from "./types"

export const $TokenLsit = <T extends Token>(list: T[]) => component((
  [sampleChoose, choose]: Behavior<INode, T>,
  [sampleRequestTokenList, reuqestTokenList]: Behavior<number, number>,

) => {

  const $tokenList = $VirtualScroll({
    dataSource: map((page): ScrollResponse => {
      const $items = list.map(token => {
        const changeTokenBehavior = sampleChoose(event('click'), constant(token))

        return $row(changeTokenBehavior, layoutSheet.spacing)(
          $icon({ $content: token.$icon, fill: pallete.message, width: 26, viewBox: '0 0 32 32' }),
          $text(token.label)
        )
      })

      return { $items, totalItems: list.length }
    }, reuqestTokenList)
  })({
    scrollRequest: sampleRequestTokenList()
  })



  return [
    layoutSheet.spacing($tokenList),

    { choose }
  ]
})