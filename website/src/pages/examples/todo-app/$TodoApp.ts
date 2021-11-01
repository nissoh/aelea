
import { behavior, Behavior, replayLatest } from '@aelea/core'
import { $element, $text, component, style } from '@aelea/dom'
import { $Checkbox, $column, $row, layoutSheet, state } from '@aelea/ui-components'
import { pallete } from '@aelea/ui-components-theme'
import { chain, combine, empty, mergeArray, now, switchLatest, take, until } from '@most/core'
import $CreateTodo, { Todo } from './$CreateTodo'
import $TodoItem from './$TodoItem'



export const $label = $element('label')(
  layoutSheet.row,
  style({ cursor: 'pointer', alignItems: 'center', color: pallete.foreground })
)


export default (todos: Todo[]) => component((
  [newTodo, createTodoTether]: Behavior<Todo, Todo>,
  [showCompletedList, showCompletedListTether]: Behavior<boolean, boolean>,
) => {

  const INITIAL_SHOW_COMPLETED = false
  const showCompleteState = replayLatest(showCompletedList, INITIAL_SHOW_COMPLETED)

  return [
    $column(layoutSheet.spacingBig)(

      $row(layoutSheet.spacingBig)(
        $label(layoutSheet.spacing)(
          $Checkbox({ value: showCompleteState })({
            check: showCompletedListTether()
          }),
          $text('Show completped ')
        ),
        $CreateTodo({
          add: createTodoTether()
        }),
      ),

      $column(layoutSheet.spacingSmall)(
        chain((todo: Todo) => {

          const [remove, removeTether] = behavior<MouseEvent, MouseEvent>()
          const [completed, completedTether] = behavior<boolean, boolean>()

          const todoCompleted = replayLatest(completed, todo.completed)

          return until(remove)(
            switchLatest(
              combine(
                (onlyCompleted, isCompleted) => onlyCompleted === isCompleted
                  ? $TodoItem({ todo, completed: take(1, todoCompleted) })({
                    remove: removeTether(),
                    complete: completedTether()
                  })
                  : empty(),
                showCompleteState,
                todoCompleted
              )
            )
          )

        }, mergeArray([newTodo, ...todos.map(now)]))
      )

    )
  ]
})


