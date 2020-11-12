
import { chain, combine, empty, mergeArray, now, switchLatest, until } from '@most/core';
import { $text, behavior, Behavior, component, state, style } from '@aelea/core';
import { $column, $seperator } from '../../common/common';
import { $label } from '../form/form';
import * as designSheet from '../../common/stylesheet';
import $Checkbox from '../form/$Checkbox';
import $CreateTodo, { Todo } from './$CreateTodo';
import $TodoItem from './$TodoItem';


const [sampleShowComplete, showCompleted] = state(false)


const $todosList = chain((model: Todo) => {

  const [sampleRemove, remove] = behavior<MouseEvent, MouseEvent>()
  const [sampleCompleted, completed] = state(model.completed)
  const [sampleText] = state(model.text)

  const $todoItem = $TodoItem(model, completed)({
    remove: sampleRemove(),
    complete: sampleCompleted(),
    text: sampleText(),
  })

  const todoStream = switchLatest(
    combine((onlyCompleted, isCompleted) =>
      onlyCompleted === isCompleted
        ? $todoItem
        : empty(),
      showCompleted,
      completed
    )
  )

  return until(remove, todoStream)
})


export default (todos: Todo[]) => component(([sampleCreateTodo, newTodo]: Behavior<Todo, Todo>) => [
  $column(designSheet.spacingBig)(

    $column(designSheet.spacingSmall)(
      $CreateTodo({
        add: sampleCreateTodo()
      }),
      $label(
        $Checkbox({ setCheck: showCompleted })({
          check: sampleShowComplete()
        }),
        $text(style({ padding: '0 10px' }))(
          'Show completped '
        )
      ),
    ),
    $seperator,
    $column(designSheet.spacingSmall)(
      $todosList(
        mergeArray([newTodo, ...todos.map(now)])
      )
    )

  )
])


