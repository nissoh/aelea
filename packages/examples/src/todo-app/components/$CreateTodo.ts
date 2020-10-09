import { DomNode, style, $text, state, component, Behavior, event } from "fufu"
import { constant, snapshot, now, merge, tap, map } from "@most/core"
import { $row } from "../../common/common"
import { $Button } from "../../common/form/button"
import { $form } from "../../common/form/form.common"
import { $Input } from "../../common/form/input"

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


export default component((
    [sampleSubmit, submit]: Behavior<ContainerDomNode<HTMLFormElement>, Event>
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
                })({})
            )
        ),
        {
            add,
            // input
        }
    ]

})