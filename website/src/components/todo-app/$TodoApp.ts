
import { $text, behavior, Behavior, component, state, style } from '@aelea/core';
import { chain, combine, empty, mergeArray, now, switchLatest, until } from '@most/core';
import { $column, $seperator } from '../../common/common';
import * as designSheet from '../../common/stylesheet';
import $Checkbox from '../form/$Checkbox';
import { $label } from '../form/form';
import $CreateTodo, { Todo } from './$CreateTodo';
import $TodoItem from './$TodoItem';




export default (todos: Todo[]) => component((
  [sampleCreateTodo, newTodo]: Behavior<Todo, Todo>
) => {

  const [sampleShowCompletedList, showCompletedList] = state(false)

  return [
    $column(designSheet.spacingBig)(

      $column(designSheet.spacingSmall)(
        $CreateTodo({
          add: sampleCreateTodo()
        }),
        $label(
          $Checkbox({ value: showCompletedList })({
            check: sampleShowCompletedList()
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


