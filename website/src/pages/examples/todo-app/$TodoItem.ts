import { now } from '@most/core'
import type { Stream } from '@most/types'
import { O, type Behavior } from 'aelea/core'
import { component, style } from 'aelea/dom'
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
      [remove, removeTether]: Behavior<MouseEvent, MouseEvent>,
      [complete, completeTether]: Behavior<boolean, boolean>,
      [text, textTether]: Behavior<string, string>,
    ) => {
      return [
        $row(rowStyle)(
          $Checkbox({ value: completed })({
            check: completeTether(),
          }),
          $Field({ value: now(todo.text) })({
            change: textTether(),
          }),
          $TrashBtn({
            click: removeTether(),
          }),
        ),

        { text, remove, complete },
      ]
    },
  )
