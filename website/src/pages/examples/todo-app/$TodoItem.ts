import { Behavior, component, O, style } from '@aelea/core'
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
  [sampleRemove, remove]: Behavior<MouseEvent, MouseEvent>,
  [sampleComplete, complete]: Behavior<boolean, boolean>,
  [sampleText, text]: Behavior<string, string>
) => {

  return [
    $row(rowStyle)(
      $Checkbox({ change: completed })({
        check: sampleComplete()
      }),
      $Field({ change: now(todo.text) })({
        change: sampleText()
      }),
      $TrashBtn({
        click: sampleRemove()
      })
    ),

    { text, remove, complete }
  ]
})


