import { constant, map, merge, now, snapshot, startWith } from "@most/core"
import type { Behavior } from "aelea/core"
import { $text, component, style } from "aelea/dom"
import { $Button, $Field, $row } from "aelea/ui-components"

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
  [create, addTether]: Behavior<PointerEvent, PointerEvent>,
  [inputChange, inputChangeTether]: Behavior<string, string>
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
    $row(style({ flex: 1 }))(
      $Field({ value })({
        change: inputChangeTether()
      }),
      $Button({ $content: $text('add'), disabled })({
        click: addTether()
      })
    ),

    { add }
  ]

})