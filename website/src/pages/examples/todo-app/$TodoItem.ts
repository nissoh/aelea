import { component, style } from '@aelea/dom'
import { Behavior, O } from '@aelea/core'
import { $Checkbox, $Field, $row, layoutSheet } from "@aelea/ui-components"
import { now } from "@most/core"
import { Stream } from "@most/types"
import { $TrashBtn } from '../../../elements/$common'
import { Todo } from "./$CreateTodo"



const rowStyle = O(
  layoutSheet.spacing,
  style({ alignItems: 'center' })
)

interface TodoItem {
  todo: Todo,
  completed: Stream<boolean>
}

export default ({ todo, completed }: TodoItem) => component((
  [remove, removeTether]: Behavior<MouseEvent, MouseEvent>,
  [complete, completeTether]: Behavior<boolean, boolean>,
  [text, textTether]: Behavior<string, string>
) => {

  return [
    $row(rowStyle)(
      $Checkbox({ value: completed })({
        check: completeTether()
      }),
      $Field({ value: now(todo.text) })({
        change: textTether()
      }),
      $TrashBtn({
        click: removeTether()
      })
    ),

    { text, remove, complete }
  ]
})


