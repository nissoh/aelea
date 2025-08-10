import { combineMap, empty, joinMap, merge, now, switchLatest, take, until } from 'aelea/stream'
import { behavior, type IBehavior, replay } from 'aelea/stream-extended'
import { $element, $text, component, style } from 'aelea/ui'
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
      [newTodo, createTodoTether]: IBehavior<Todo, Todo>,
      [showCompletedList, showCompletedListTether]: IBehavior<boolean, boolean>
    ) => {
      const INITIAL_SHOW_COMPLETED = false
      const showCompleteState = replay(INITIAL_SHOW_COMPLETED, showCompletedList)

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
            joinMap(
              (todo: Todo) => {
                const [remove, removeTether] = behavior<MouseEvent, MouseEvent>()
                const [completed, completedTether] = behavior<boolean, boolean>()

                const todoCompleted = replay(todo.completed, completed)

                return until(remove)(
                  switchLatest(
                    combineMap(
                      (onlyCompleted, isCompleted) =>
                        onlyCompleted === isCompleted
                          ? $TodoItem({
                              todo,
                              completed: take(1, todoCompleted)
                            })({
                              remove: removeTether(),
                              complete: completedTether()
                            })
                          : empty,
                      showCompleteState,
                      todoCompleted
                    )
                  )
                )
              },
              merge(newTodo, ...todos.map(now))
            )
          )
        )
      ]
    }
  )
