
import { chain, combine, empty, mergeArray, now, periodic, skip, switchLatest, until } from '@most/core';
import { map } from '@most/prelude';
import { $text, behavior, Behavior, component, state, style } from 'fufu';
import { $column, $mainCard, $seperator } from '../common/common';
import { $label } from '../common/form';
import { $Checkbox } from '../common/form/checkbox';
import * as designSheet from '../common/style/stylesheet';
import $CreateTodo, { createTodo, Todo } from './components/$CreateTodo';
import $TodoItem from './components/$TodoItem';


// start application with X amount of todo's
const todos = Array(5).fill(undefined).map((x, i) => createTodo('t-' + (i + 1)))

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


export default component(([sampleCreateTodo, newTodo]: Behavior<Todo, Todo>) => [
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


