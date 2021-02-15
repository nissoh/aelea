import { now } from "@most/core"
import { Behavior, component, O, style } from '@aelea/core'
import { $row, $TrashBtn } from "../../common/common"
import { spacing } from "../../common/stylesheet"
import $Checkbox from "../form/$Checkbox"
import $Input from "../form/$Input"
import { Todo } from "./$CreateTodo"


const rowStyle = O(
  spacing,
  style({ alignItems: 'center' })
)

interface TodoItem {
  todo: Todo,
  completed: boolean
}

export default ({ todo, completed }: TodoItem) => component((
  [sampleRemove, remove]: Behavior<MouseEvent, MouseEvent>,
  [sampleComplete, complete]: Behavior<boolean, boolean>,
  [sampleText, text]: Behavior<string, string>
) => {

  return [
    $row(rowStyle)(
      $Checkbox({ inital: completed })({
        check: sampleComplete()
      }),
      $Input({ setValue: now(todo.text) })({
        value: sampleText()
      }),
      $TrashBtn({
        click: sampleRemove()
      })
    ),
    {
      text,
      remove,
      complete
    }
  ]
})


