
import { component, $node, style, $text, event, O, StyleCSS, eventTarget, create, $svg, motion, attr, nodeEffect, throttleRaf, $element, Behavior, DomNode, Sample } from 'fufu'
import * as stylesheet from '../style/stylesheet'
import { $column, $row } from '../common/flex'
import { map, until, merge, switchLatest, chain, empty, runEffects, snapshot, filter, constant, now, never, startWith } from '@most/core';
import { Stream } from '@most/types';
import { remove as removeFromArray, findIndex } from '@most/prelude';
import { newDefaultScheduler } from '@most/scheduler';
import { $field } from '../common/form';



const $container = $node(
  style({
    position: 'absolute',
    top: '0',
    left: '0',
    right: '0',
    bottom: '0',
    userSelect: 'none',
    overflow: 'hidden',
    display: 'flex'
  })
)
const $content = $column(
  style({
    padding: '50px',
    transformOrigin: 'left top',
    transform: 'translateZ(0)',
    cursor: 'grab',
    position: 'absolute',
  })
)


const $title = $node(
  style({
    fontSize: '30px'
  })
)


function elementTransformArgs(el: HTMLElement) {
  return el.style.transform.replace(/[^0-9\-.,]/g, '').split(',').map(Number)
}

function mouseVelocity(from: PointerEvent, to: PointerEvent) {
  const xdist = to.pageX - from.pageX
  const ydist = to.pageY - from.pageY

  const interval = to.timeStamp - from.timeStamp;

  return Math.sqrt(xdist * xdist + ydist * ydist) / interval
}

const clamp = (val: number, min: number, max: number) =>
  val > max ? max
    : val < min ? min
      : val




const moveStart = O(
  event('pointerdown'),
  map(startEv => {
    if (!(startEv.currentTarget instanceof HTMLElement)) {
      throw new Error('target is not an Element type')
    }

    const target = startEv.currentTarget
    const containerWidth = target.parentElement!.clientWidth
    const containerHeight = target.parentElement!.clientHeight

    // minX to 0 will avoid scrolling via @calmp function ^
    const minX = target.clientWidth > containerWidth ? -target.clientWidth + containerWidth : 0
    const minY = target.clientHeight > containerHeight ? -target.clientHeight + containerHeight : 0

    const [initElX = 0, initElY = 0] = elementTransformArgs(target);

    const initX = startEv.pageX - initElX
    const initY = startEv.pageY - initElY

    const pointingMove = O(
      eventTarget('pointermove'),
      throttleRaf,
      map(ev => ({
        x: ev.pageX - initX,
        y: ev.pageY - initY
      }))
    )(window)

    const stop = eventTarget('pointerup', window)

    const decelerate = chain(ev => {
      const vlc = mouseVelocity(startEv, ev)

      const [currentElX = 0, currentElY = 0] = elementTransformArgs(target);
      const tx = (ev.pageX - startEv.pageX) * vlc
      const ty = (ev.pageY - startEv.pageY) * vlc

      return map(freq => {
        return { x: currentElX + (tx * freq), y: currentElY + (ty * freq) }
      }, motion())
    }, stop)

    const move = merge(
      until(stop, pointingMove),
      decelerate
    )



    return map(state => {
      const { x, y } = state
      return {
        transform: `translate(${clamp(x, minX, 0)}px, ${clamp(y, minY, 0)}px)`
      } as StyleCSS
    }, move)
  }),
  switchLatest
)

const svgClick = O(
  event('pointerdown'),
  map(downEv => {

    const up = eventTarget('pointerup', downEv.currentTarget!)
    const move = eventTarget('pointermove', downEv.currentTarget!)
    const stop = until(up)

    const target = downEv.target

    if (target instanceof SVGCircleElement) {

      const initX = target.cx.baseVal.value
      const initY = target.cy.baseVal.value

      const decelerate = switchLatest(
        map(ev => {
          const vlc = mouseVelocity(downEv, ev)

          const cX = target.cx.baseVal.value
          const cY = target.cy.baseVal.value

          const tx = (ev.pageX - downEv.pageX) * vlc
          const ty = (ev.pageY - downEv.pageY) * vlc

          return map(freq => (
            { cx: cX + (tx * freq), cy: cY + (ty * freq) }
          ), motion())

        }, up)
      )

      return merge(
        stop(
          map(moveEv => {
            return {
              cx: moveEv.pageX - downEv.pageX + initX,
              cy: moveEv.pageY - downEv.pageY + initY
            }
          }, move)
        ),
        decelerate
      )
    }

    return empty()
  }),
  switchLatest
)



const $world = component(([clickBehavior, linePosition]: Behavior<DomNode, any>) =>

  $svg('svg')(clickBehavior(svgClick))(
    $svg('circle')(
      attr({ cx: 50, cy: 60, r: 50 }),
      attr(linePosition)
    )()
  )

)

const $btn = $element('button')



type Todo = {
  text: string
  id: number
  completed: boolean
}

let iid = 0


const $newTodoField = (
  [sampleAdd, added]: Behavior<DomNode, Stream<Todo>>,
  [sampleRemove, removed]: Behavior<DomNode, Todo>
) =>
  component(([inputBehavior, input]: Behavior<DomNode, Event>) => {

    const submitBehavior = sampleAdd(
      O(
        event('click'),
        snapshot((inputEvent, buttonClick) => {
          const target = inputEvent.target;

          if (target instanceof HTMLInputElement) {
            const text = target.value
            target.value = ''
            return text || '';
          }

          return ''
        }, input),
        map(text => {

          const id = ++iid
          const always: Stream<Todo> = startWith({
            text,
            id
          }, never())

          return until(filter((todo => todo.id === id), removed), always)
        }),
      )
    )


    return (
      $row(
        $field({ label: 'Name' }, inputBehavior),
        $btn(submitBehavior)(
          $text('add')
        )
      )
    )
  })


const click = O(
  event('click')
)

const $todoItem = (todo: Stream<Todo>, sampleRemove: Sample<DomNode, Todo>) => {
  // const removeBehavior = sampleRemove(O(click, constant(todo)))

  return (
    $row(style({ padding: '8px' }))(
      $text(map(t => t.text, todo)),
      // $btn(removeBehavior)(
      //   $text('X')
      // )
    )
  )
}

const $todoList = component((
  addB: Behavior<DomNode, Stream<Todo>>,
  removeB: Behavior<DomNode, Todo>
) => {

  const todosFromMemoy = now(<Todo[]>[]);

  // const newTodoS = snapshot((item, list) => removeFromArray(findIndex(item, list), list), sampleTodo, todosFromMemoy)
  // const removeS = snapshot((item, list) => removeFromArray(findIndex(item, list), list), sampleRemove, todosFromMemoy)


  // const list$ = merge(newTodoS, removeS)

  return (

    $column(
      $newTodoField(addB, removeB),
      chain(todo => $todoItem(todo, removeB[0]), addB[1])
    )

  )
})


const headline = `
Reactive UI Toolkit
For the eventive World
`.trim()

const $introComponent = component(() =>
  $row(
    $title(style({ width: '500px', height: '500px' }))(
      $text(style({ whiteSpace: 'pre-line' }))(headline)
    ),
    $column(style({ width: '500px' }))(
      $todoList
      // $world
    )
  )
)

const $panningUI = component((
  [styleBehavior, panningStyle]: Behavior<DomNode, StyleCSS<HTMLElement>>
) =>
  $container(
    // $introComponent
    $content(styleBehavior(moveStart), style(panningStyle))(
      $introComponent
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
  }),
  stylesheet.main
)

const $main = $body(
  $panningUI
)

runEffects(
  nodeEffect($main),
  newDefaultScheduler()
)


