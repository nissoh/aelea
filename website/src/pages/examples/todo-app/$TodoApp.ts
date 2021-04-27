
import { $element, $text, behavior, Behavior, component, style } from '@aelea/core'
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
  [sampleCreateTodo, newTodo]: Behavior<Todo, Todo>,
  [sampleShowCompletedList, showCompletedList]: Behavior<boolean, boolean>,
) => {

  // const [sampleShowCompletedList, showCompletedList] = state.stateBehavior(false)
  const INITIAL_SHOW_COMPLETED = false

  const showCompleteState = state.replayLatest(showCompletedList, INITIAL_SHOW_COMPLETED)

  return [
    $column(layoutSheet.spacingBig)(

      $row(layoutSheet.spacingBig)(
        $label(layoutSheet.spacing)(
          $Checkbox({ value: now(INITIAL_SHOW_COMPLETED) })({
            check: sampleShowCompletedList()
          }),
          $text('Show completped ')
        ),
        $CreateTodo({
          add: sampleCreateTodo()
        }),
      ),

      $column(layoutSheet.spacingSmall)(
        chain((todo: Todo) => {

          const [sampleRemove, remove] = behavior<MouseEvent, MouseEvent>()
          const [sampleCompleted, completed] = behavior<boolean, boolean>()

          const todoCompleted = state.replayLatest(completed, todo.completed)

          return until(remove)(
            switchLatest(
              combine(
                (onlyCompleted, isCompleted) => onlyCompleted === isCompleted
                  ? $TodoItem({ todo, completed: take(1, todoCompleted) })({
                    remove: sampleRemove(),
                    complete: sampleCompleted()
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


