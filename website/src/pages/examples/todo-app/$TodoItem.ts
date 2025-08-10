import { type IBehavior, type IStream, now, o } from 'aelea/stream'
import { component, style } from 'aelea/ui'
import { $Checkbox, $Field, $row, spacing } from 'aelea/ui-components'
import { $TrashBtn } from '../../../elements/$common'
import type { Todo } from './$CreateTodo'

const rowStyle = o(spacing.default, style({ alignItems: 'center' }))

interface TodoItem {
  todo: Todo
  completed: IStream<boolean>
}

export default ({ todo, completed }: TodoItem) =>
  component(
    (
      [remove, removeTether]: IBehavior<MouseEvent, MouseEvent>,
      [complete, completeTether]: IBehavior<boolean, boolean>,
      [text, textTether]: IBehavior<string, string>
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
    }
  )
