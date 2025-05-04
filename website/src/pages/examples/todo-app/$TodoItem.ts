import { now } from '@most/core'
import type { Stream } from '@most/types'
import { type IBehavior, O } from 'aelea/core'
import { component, style } from 'aelea/core'
import { $Checkbox, $Field, $row, spacing } from 'aelea/ui-components'
import { $TrashBtn } from '../../../elements/$common'
import type { Todo } from './$CreateTodo'

const rowStyle = O(spacing.default, style({ alignItems: 'center' }))

interface TodoItem {
  todo: Todo
  completed: Stream<boolean>
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
