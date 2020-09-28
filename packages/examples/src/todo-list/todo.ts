import { DomNode, style, $text, state, component, Behavior, event, ReplayLatest, O } from "fufu"
import { constant, snapshot, now, merge, tap, map } from "@most/core"
import { $row, $TrashBtn } from "../common/common"
import { spacing } from "../common/style/stylesheet"
import { $Button } from "../common/form/button"
import { $Checkbox } from "../common/form/checkbox"
import { $form } from "../common/form/form.common"
import { $Input } from "../common/form/input"

let iid = 0

export interface Todo {
  id: number,
  text: string,
  completed: boolean,
}

export function createTodo(text: string): Todo {
  return {
    id: iid++,
    text,
    completed: false
  }
}

const rowStyle = O(
  spacing,
  style({ alignItems: 'center' })
)

const $TodoItem = (todo: Todo, completed: ReplayLatest<boolean>) => component((
  [sampleRemove, remove]: Behavior<MouseEvent, MouseEvent>,
  [sampleComplete, complete]: Behavior<boolean, boolean>,
  [sampleText, text]: Behavior<string, string>
) => {

  return [
    $row(rowStyle)(
      $Checkbox({ setCheck: completed })({
        check: sampleComplete()
      }),
      $Input({ setValue: now(todo.text) })({
        value: sampleText()
      }),
      $TrashBtn({
        click: sampleRemove()
      })
    ),
    {
      text,
      remove,
      complete
    }
  ]
})

export const $NewTodoField = component((
  [sampleSubmit, submit]: Behavior<DomNode<HTMLFormElement>, Event>
) => {

  const [sampleInput, input] = state<string, string>('')

  const submitBehavior = sampleSubmit(
    event('submit'),
    tap(ev => {
      // prevents form from directing to non-existing location
      ev.preventDefault()
    })
  )

  const add = snapshot(
    createTodo,
    input,
    submit
  )

  const resetOnAdd = constant('', merge(add, now(null)))

  return [
    $form(submitBehavior, style({ marginBottom: '10px' }))(
      $row(
        $Input({ setValue: resetOnAdd })({
          value: sampleInput()
        }),
        $Button({
          $content: $text('add'),
          disabled: map(x => !Boolean(x), merge(input, resetOnAdd))
        })()
      )
    ),
    {
      add,
      // input
    }
  ]

})




export default $TodoItem