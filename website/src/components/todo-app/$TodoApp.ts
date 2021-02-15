
import { $text, behavior, Behavior, component, style } from '@aelea/core';
import { chain, combine, empty, mergeArray, now, startWith, switchLatest, until } from '@most/core';
import { $column, $seperator } from '../../common/common';
import * as designSheet from '../../common/stylesheet';
import $Checkbox from '../form/$Checkbox';
import { $label } from '../form/form';
import $CreateTodo, { Todo } from './$CreateTodo';
import $TodoItem from './$TodoItem';




export default (todos: Todo[]) => component((
  [sampleCreateTodo, newTodo]: Behavior<Todo, Todo>,
  [sampleShowComplete, showCompleted]: Behavior<boolean, boolean>
) => {

  const initialShowCompleted = false

  return [
    $column(designSheet.spacingBig)(

      $column(designSheet.spacingSmall)(
        $CreateTodo({
          add: sampleCreateTodo()
        }),
        $label(
          $Checkbox({ inital: initialShowCompleted })({
            check: sampleShowComplete()
          }),
          $text(style({ padding: '0 10px' }))(
            'Show completped '
          )
        ),
      ),

      $seperator,

      $column(designSheet.spacingSmall)(
        chain((todo: Todo) => {

          const [sampleRemove, remove] = behavior<MouseEvent, MouseEvent>()
          const [sampleCompleted, completed] = behavior<boolean, boolean>()

          const newLocal = startWith(initialShowCompleted, showCompleted)
          const newLocal_1 = startWith(todo.completed, completed)

          return until(remove)(
            switchLatest(
              combine(
                (onlyCompleted, isCompleted) => onlyCompleted === isCompleted
                  ? $TodoItem({ todo, completed: isCompleted })({
                    remove: sampleRemove(),
                    complete: sampleCompleted()
                  })
                  : empty(),
                newLocal,
                newLocal_1
              )
            )
          )

        }, mergeArray([newTodo, ...todos.map(now)]))
      )

    )
  ]
})


