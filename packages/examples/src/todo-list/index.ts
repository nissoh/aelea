
import { chain, combine, empty, mergeArray, now, switchLatest, until } from '@most/core';
import { newDefaultScheduler } from '@most/scheduler';
import { $text, behavior, Behavior, component, runAt, state, style } from 'fufu';
import { $column, $examplesRoot, $seperator } from '../common/common';
import { $label } from '../common/form';
import { $Checkbox } from '../common/form/checkbox';
import * as designSheet from '../common/style/stylesheet';
import $TodoItem, { $NewTodoField, createTodo, Todo } from './todo';



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

const $TodoApp = component((
  [sampleAdd, newTodo]: Behavior<Todo, Todo>,
) => {

  return [

    mergeArray([
      $column(designSheet.spacingSmall)(
        $NewTodoField({
          add: sampleAdd(),
          // input: sampleInput()
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

    ].reverse())

  ]

})



runAt(
  $examplesRoot(
    $TodoApp({})
  ),
  newDefaultScheduler()
)

