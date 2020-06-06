
import { component, style, $text, event, create, nodeEffect, $element, Behavior, DomNode, Sample, Stream, attr, O, $node } from 'fufu'
import * as stylesheet from '../style/stylesheet'
import { $column, $row } from '../common/flex'
import { map, chain, runEffects, snapshot, constant, until, filter, now, mergeArray, continueWith, switchLatest, startWith, empty } from '@most/core';
import { newDefaultScheduler } from '@most/scheduler';
import { $field } from '../common/form';
import { Sink } from '@most/types';


let iid = 0


type Todo = {
  text: string
  completed: boolean
  id: number
}


function targetValue(target: EventTarget | null) {
  if (target instanceof HTMLInputElement) {
    return target.value;
  }

  throw new Error('target is not a type of input')
}

function targetCheck(target: EventTarget | null) {
  if (target instanceof HTMLInputElement) {
    return target.checked;
  }

  throw new Error('target is not a type of input')
}


function inputEventValue(inputEvent: KeyboardEvent) {
  const target = inputEvent.target;

  if (target instanceof HTMLInputElement) {
    const text = target.value
    target.value = ''
    return text || '';
  }

  return ''
}

function inputCheckedValue(inputEvent: Event) {
  const target = inputEvent.target;

  if (target instanceof HTMLInputElement) {
    return target.checked;
  }

  throw new Error('target is not type of input')
}

const matchBy = <T>(a: T) => (prop: keyof T) => (b: T) => {
  return a[prop] === b[prop]
}


const $btn = $element('button')(stylesheet.btn)
const $checkbox = (state: boolean, sampleChange: Sample<DomNode<HTMLInputElement>, boolean>) =>
  $element('input')(
    sampleChange(
      event('change'),
      map(x => targetCheck(x.target)),
      startWith(state),
    ),
    attr({ type: 'checkbox', [state ? 'checked' : 'unchecked']: null })
  )


const $newTodoField =
  (sampleAdd: Sample<DomNode, Todo>) => component(
    ([inputBehavior, input]: Behavior<DomNode, KeyboardEvent>) => {

      const submitBehavior = sampleAdd(
        event('click'),
        snapshot(inputEventValue, input),
        map(text => ({
          text,
          id: ++iid,
          completed: false
        })),
      )

      return (
        $row(
          $field({ label: 'Name' }, inputBehavior),
          $btn(submitBehavior)(
            $text('add')
          )
        )
      )
    }
  )

const $todoItem = (
  todo: Todo,
  remove: Sample<DomNode, Todo>,
  changeTodo: Sample<DomNode, Todo>,
  setComplete: Sample<DomNode, boolean>,
) => {
  const removeBehavior = remove(
    event('click'),
    constant(todo)
  )

  const toggleComplete = changeTodo(
    event('click'),
    map(() => ({
      ...todo,
      completed: !todo.completed
    }))
  )

  return (

    $row(style({ padding: '8px' }))(
      $checkbox(todo.completed, setComplete)(toggleComplete)(
        $text('comple')
      ),
      $text(todo.text),
      $btn(removeBehavior)(
        $text('X')
      )
    )

  )
}

const todos: Stream<Todo> = mergeArray([
  now({
    text: 'blabla',
    id: ++iid,
    completed: false
  }),
  now({
    text: 'wakka www',
    id: ++iid,
    completed: false
  }),
])

const $label = $element('label')(
  stylesheet.row,
  style({ alignItems: 'center', margin: '10px 0 ' })
)


const $todoList = component((
  [add, newTodo]: Behavior<DomNode, Todo>,
  [changeTodo, todoChanges]: Behavior<DomNode, Todo>,
  [remove, removed]: Behavior<DomNode, Todo>,
  [toggleTodoComplete, todoCompleted]: Behavior<DomNode, boolean>,
  [toggleFilterByComplete, showCompleted]: Behavior<DomNode, boolean>,
) =>
  $row(
    $column(
      $newTodoField(add),
      $label(
        $checkbox(false, toggleFilterByComplete)(),
        $text('Show only completed')
      ),
    ),

    $node(style({ padding: '10px' }))(),

    $column(
      chain(
        model => {

          const onRemove = filter(
            matchBy(model)('id'),
            removed
          )

          const todoStream: Stream<DomNode<HTMLElement>> = switchLatest(
            map(
              completed => completed === model.completed ? $todoItem(model, remove, changeTodo, toggleTodoComplete) : empty(),
              showCompleted
            )
          )

          return until(onRemove, todoStream)
        },
        mergeArray([newTodo, todos])
      )
    )
  )
)


const $body = create(map(x => x))(document.body)(
  style({
    backgroundColor: '#5c6a76',
    margin: '0',
    height: '100vh',
    display: 'flex',
    color: '#d7dae0',
    fontSize: '16px',
    alignItems: 'center',
    justifyContent: 'center',
  }),
  stylesheet.main,
)

const $main = $body(
  $todoList
)

interface Graph {
  sink: Sink<any>
  graph: Graph[]
}

const sinkGraph: Graph[] = []

// function patchSinkGraph(sink: Sink<any>, parentGraph: Graph[]) {
//   const sfn = sink.event
//   const graph: Graph[] = []

//   parentGraph.push({ sink, graph })

//   sink.event = (t, x) => {
//     sfn.call(sink, t, x)

//     patchSinkGraph(sink, graph)
//   }
// }


// const runDebugger = (stream: Stream<any>) => {
//   const runf = stream.run

//   stream.run = (sink, scheduler) => {
//     patchSinkGraph(sink, sinkGraph)
//     return runf.call(stream, sink, scheduler)
//   }
//   return stream
// }


runEffects(
  nodeEffect($main),
  newDefaultScheduler()
)
// runEffects(
//   runDebugger(filter(x => !!x, map((x) => x, now('ff')))),
//   newDefaultScheduler()
// )

console.log(sinkGraph)
