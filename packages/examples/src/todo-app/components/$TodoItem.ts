import { style, component, Behavior, O } from "fufu"
import { now } from "@most/core"
import { $row, $TrashBtn } from "../../common/common"
import { spacing } from "../../common/style/stylesheet"
import { $Checkbox } from "../../common/form/checkbox"
import { $Input } from "../../common/form/input"
import { Stream } from "@most/types"
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


