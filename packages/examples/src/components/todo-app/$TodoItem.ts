import { now } from "@most/core"
import { Stream } from "@most/types"
import { Behavior, component, O, style } from "fufu"
import { $row, $TrashBtn } from "../../common/common"
import { spacing } from "../../common/stylesheet"
import $Checkbox from "../form/$Checkbox"
import $Input from "../form/$Input"
import { Todo } from "./$CreateTodo"


const rowStyle = O(
  spacing,
  style({ alignItems: 'center' })
)

export default (todo: Todo, completed: Stream<boolean>) => component((
  [sampleRemove, remove]: Behavior<MouseEvent, MouseEvent>,
  [sampleComplete, complete]: Behavior<boolean, boolean>,
  [sampleText, text]: Behavior<string, string>
) => {

  return [
    $row(rowStyle)(
      $Checkbox({ setCheck: completed })({
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


