import { chain, combine, empty, mergeArray, now, switchLatest, take, until } from '@most/core'
import { type Behavior, behavior, replayLatest } from 'aelea/core'
import { $element, $text, component, style } from 'aelea/core'
import { $Checkbox, $column, $row, spacing } from 'aelea/ui-components'
import { pallete } from 'aelea/ui-components-theme'
import type { Todo } from './$CreateTodo'
import $CreateTodo from './$CreateTodo'
import $TodoItem from './$TodoItem'

export const $label = $element('label')(
  style({ display: 'flex', flexDirection: 'row' }),
  style({ cursor: 'pointer', alignItems: 'center', color: pallete.foreground })
)

export default (todos: Todo[]) =>
  component(
    (
      [newTodo, createTodoTether]: Behavior<Todo, Todo>,
      [showCompletedList, showCompletedListTether]: Behavior<boolean, boolean>
    ) => {
      const INITIAL_SHOW_COMPLETED = false
      const showCompleteState = replayLatest(showCompletedList, INITIAL_SHOW_COMPLETED)

      return [
        $column(spacing.big)(
          $row(spacing.big)(
            $label(spacing.default)(
              $Checkbox({ value: showCompleteState })({
                check: showCompletedListTether()
              }),
              $text('Show completped ')
            ),
            $CreateTodo({
              add: createTodoTether()
            })
          ),

          $column(spacing.small)(
            chain(
              (todo: Todo) => {
                const [remove, removeTether] = behavior<MouseEvent, MouseEvent>()
                const [completed, completedTether] = behavior<boolean, boolean>()

                const todoCompleted = replayLatest(completed, todo.completed)

                return until(remove)(
                  switchLatest(
                    combine(
                      (onlyCompleted, isCompleted) =>
                        onlyCompleted === isCompleted
                          ? $TodoItem({
                              todo,
                              completed: take(1, todoCompleted)
                            })({
                              remove: removeTether(),
                              complete: completedTether()
                            })
                          : empty(),
                      showCompleteState,
                      todoCompleted
                    )
                  )
                )
              },
              mergeArray([newTodo, ...todos.map(now)])
            )
          )
        )
      ]
    }
  )
