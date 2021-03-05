import { Behavior, component, O, style } from '@aelea/core'
import { $Checkbox, $Input, $row, $TrashBtn, layoutSheet } from "@aelea/ui-components"
import { now } from "@most/core"
import { Stream } from "@most/types"
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
  [sampleRemove, remove]: Behavior<MouseEvent, MouseEvent>,
  [sampleComplete, complete]: Behavior<boolean, boolean>,
  [sampleText, text]: Behavior<string, string>
) => {

  return [
    $row(rowStyle)(
      $Checkbox({ value: completed })({
        check: sampleComplete()
      }),
      $Input({ value: now(todo.text) })({
        change: sampleText()
      }),
      $TrashBtn({
        click: sampleRemove()
      })
    ),

    { text, remove, complete }
  ]
})


