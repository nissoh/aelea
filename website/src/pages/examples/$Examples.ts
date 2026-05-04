import { type IBehavior, state } from 'aelea/stream-extended'
import { $node, $text, component, style } from 'aelea/ui'
import { $column, $row, spacing } from 'aelea/ui-components'
import { palette } from 'aelea/ui-components-theme'
import { $Link, commitTitle, match } from 'aelea/ui-router'
import { $Example } from '../../components/$Example'
import { fadeIn } from '../../components/transitions/enter'
import { routeSchema } from '../../route'
import $Calculator from './calculator/$Calculator'
import { $Controllers } from './controllers/$Controllers'
import { $CountCounters } from './count-counters/$CountCounters'
import $DragList from './dragList/$DragList'
import { $PopoverExample } from './overlay/$PopoverExample'
import { $QuantumScrollExample } from './quantum-scroll/$QuantumScrollExample'
import { $TableExample } from './table/$TableExample'
import { $Theme } from './theme/$Theme'
import { $ToastQueue } from './toast-queue/$ToastQueue'
import { createTodo } from './todo-app/$CreateTodo'
import $TodoApp from './todo-app/$TodoApp'

export default () =>
  component(() => {
    const examples = routeSchema.pages.examples

    return [
      $row(spacing.big, style({ placeContent: 'center', flex: 1 }))(
        fadeIn(
          $column(
            spacing.default,
            style({ top: '10vh', placeContent: 'center flex-start' })
          )(
            $column(spacing.big, style({ whiteSpace: 'nowrap' }))(
              $column(spacing.tiny)(
                $node(style({ color: palette.foreground, fontSize: '75%' }))($text('Demos')),
                $Link({ $content: $text('Theme'), route: examples.theme })({}),
                $Link({ $content: $text('Drag And Sort'), route: examples.dragAndSort })({}),
                $Link({ $content: $text('Count Counters'), route: examples.countCounters })({}),
                $Link({ $content: $text('Todo App'), route: examples.todoApp })({}),
                $Link({ $content: $text('Calculator'), route: examples.calculator })({})
              ),

              $column(spacing.tiny)(
                $node(style({ color: palette.foreground, fontSize: '75%' }))($text('UI Components')),
                $Link({ $content: $text('Quantum Scroll'), route: examples.quantumScroll })({}),
                $Link({ $content: $text('Popover'), route: examples.popover })({}),
                $Link({ $content: $text('Table'), route: examples.table })({}),
                $Link({ $content: $text('Toast Queue'), route: examples.toastQueue })({})
              )
            )
          )
        ),

        $node(),

        $column(style({ flex: 2 }))(
          match(examples.controllers)(commitTitle('Controllers')($Example($Controllers({}))({}))),

          match(examples.theme)(commitTitle('Theme')($Example($column($Theme({})))({}))),

          match(examples.dragAndSort)(commitTitle('Drag N Drop')($Example($DragList({}))({}))),

          match(examples.popover)(commitTitle('Popover')($Example($PopoverExample({}))({}))),

          match(examples.table)(commitTitle('Table')($Example($column($TableExample({})))({}))),

          match(examples.calculator)(commitTitle('Calculator')($Example($Calculator({}))({}))),

          match(examples.quantumScroll)(commitTitle('Quantum Scroll')($Example($QuantumScrollExample({}))({}))),

          match(examples.toastQueue)(commitTitle('Toast Queue')($Example($ToastQueue({}))({}))),

          match(examples.countCounters)(
            commitTitle('Count Counters')(
              fadeIn(
                component(([changeCounterList, changeCounterListTether]: IBehavior<number[]>) => {
                  const counterList = state(changeCounterList, [0])

                  return [
                    $column(
                      spacing.big,
                      style({ flex: 1 })
                    )(
                      $CountCounters({ counterList })({
                        changeCounterList: changeCounterListTether()
                      })
                    )
                  ]
                })({})
              )
            )
          ),

          match(examples.todoApp)(
            commitTitle('Todo App')(
              $Example(
                $TodoApp(
                  Array(1e2)
                    .fill(null)
                    .map((_, i) => createTodo(`t-${i + 1}`))
                )({})
              )({})
            )
          )
        )
      )
    ]
  })
