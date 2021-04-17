import { $text, Behavior, component } from '@aelea/core'
import { $Button, $Field, $row, layoutSheet } from "@aelea/ui-components"
import { constant, map, merge, now, snapshot, startWith } from "@most/core"

let iid = 0

export interface Todo {
  id: number,
  text: string,
  completed: boolean,
}

export function createTodo(text: string): Todo {
  return {
    id: iid++,
    text,
    completed: false
  }
}


export default component((
  [sampleAdd, create]: Behavior<PointerEvent, PointerEvent>,
  [sampleInputChange, inputChange]: Behavior<string, string>
) => {

  const inputState = startWith('', inputChange)
  const value = constant('', merge(create, now(null)))
  const valueChahnges = merge(inputChange, value)
  const disabled = map(x => !x, valueChahnges)

  const add = snapshot(
    (text) => ({ id: iid++, text, completed: false }),
    inputState, create
  )

  return [
    $row(layoutSheet.flex)(
      $Field({ value })({
        change: sampleInputChange()
      }),
      $Button({ $content: $text('add'), disabled })({
        click: sampleAdd()
      })
    ),

    { add }
  ]

})