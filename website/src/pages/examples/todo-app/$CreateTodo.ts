import { constant, map, merge, sampleMap, start } from 'aelea/stream'
import type { IBehavior } from 'aelea/stream-extended'
import { $text, component, style } from 'aelea/ui'
import { $Button, $Input, $row } from 'aelea/ui-components'

let iid = 0

export interface Todo {
  id: number
  text: string
  completed: boolean
}

export function createTodo(text: string): Todo {
  return {
    id: iid++,
    text,
    completed: false
  }
}

export default component(
  (
    [create, addTether]: IBehavior<PointerEvent, PointerEvent>,
    [inputChange, inputChangeTether]: IBehavior<string, string>
  ) => {
    const inputState = start('', inputChange)
    const value = start('', constant('', create))
    const valueChanges = merge(inputChange, value)
    const disabled = map(x => !x, valueChanges)

    const add = sampleMap(text => ({ id: iid++, text, completed: false }), inputState, create)

    return [
      $row(style({ flex: 1 }))(
        $Input({ value })({
          change: inputChangeTether()
        }),
        $Button({ $content: $text('add'), disabled })({
          click: addTether()
        })
      ),

      { add }
    ]
  }
)
