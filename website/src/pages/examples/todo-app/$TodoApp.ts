
import { $element, $text, behavior, Behavior, component, state, style } from '@aelea/core'
import { $Checkbox, $column, $row, layoutSheet } from '@aelea/ui-components'
import { theme } from '@aelea/ui-components-theme'
import { chain, combine, empty, mergeArray, now, switchLatest, until } from '@most/core'
import $CreateTodo, { Todo } from './$CreateTodo'
import $TodoItem from './$TodoItem'



export const $label = $element('label')(
  layoutSheet.row,
  style({ cursor: 'pointer', alignItems: 'center', color: theme.system })
)


export default (todos: Todo[]) => component((
  [sampleCreateTodo, newTodo]: Behavior<Todo, Todo>
) => {

  const [sampleShowCompletedList, showCompletedList] = state(false)

  return [
    $column(layoutSheet.spacingBig)(

      $row(layoutSheet.spacingBig)(
        $label(layoutSheet.spacing)(
          $Checkbox({ value: showCompletedList })({
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

          const [sampleCompleted, completed] = state(todo.completed)

          return until(remove)(
            switchLatest(
              combine(
                (onlyCompleted, isCompleted) => onlyCompleted === isCompleted
                  ? $TodoItem({ todo, completed })({
                    remove: sampleRemove(),
                    complete: sampleCompleted()
                  })
                  : empty(),
                showCompletedList,
                completed
              )
            )
          )

        }, mergeArray([newTodo, ...todos.map(now)]))
      )

    )
  ]
})


