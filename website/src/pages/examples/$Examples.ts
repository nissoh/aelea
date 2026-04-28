import { type IBehavior, state } from 'aelea/stream-extended'
import { $node, $text, component, style } from 'aelea/ui'
import { $column, $row, spacing } from 'aelea/ui-components'
import { pallete } from 'aelea/ui-components-theme'
import { commitTitle, match } from 'aelea/ui-router'
import { $Example } from '../../components/$Example'
import { $Link } from '../../components/$Link'
import { fadeIn } from '../../components/transitions/enter'
import { routeSchema } from '../../route'
import $Calculator from './calculator/$Calculator'
import { $CountCounters } from './count-counters/$CountCounters'
import $DragList from './dragList/$DragList'
import { $PopoverExample } from './overlay/$PopoverExample'
import { $TableExample } from './table/$TableExample'
import { $Theme } from './theme/$Theme'
import { $ToastQueue } from './toast-queue/$ToastQueue'
import { createTodo } from './todo-app/$CreateTodo'
import $TodoApp from './todo-app/$TodoApp'
import { $VirtualScrollExample } from './virtual-scroll/$VirtualScrollExample'

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
                $node(style({ color: pallete.foreground, fontSize: '75%' }))($text('Demos')),
                $Link({ $content: $text('Theme'), route: examples.theme })({}),
                $Link({ $content: $text('Drag And Sort'), route: examples.dragAndSort })({}),
                $Link({ $content: $text('Count Counters'), route: examples.countCounters })({}),
                $Link({ $content: $text('Todo App'), route: examples.todoApp })({}),
                $Link({ $content: $text('Calculator'), route: examples.calculator })({})
              ),

              $column(spacing.tiny)(
                $node(style({ color: pallete.foreground, fontSize: '75%' }))($text('UI Components')),
                $Link({ $content: $text('Virtual Scroll'), route: examples.virtualScroll })({}),
                $Link({ $content: $text('Popover'), route: examples.popover })({}),
                $Link({ $content: $text('Table'), route: examples.table })({}),
                $Link({ $content: $text('Toast Queue'), route: examples.toastQueue })({})
              )
            )
          )
        ),

        $node(),

        $column(style({ flex: 2 }))(
          match(examples.theme)(
            commitTitle('Theme')($Example({ file: 'src/components/$Table.ts' })($column($Theme({})))({}))
          ),

          match(examples.dragAndSort)(
            commitTitle('Drag N Drop')($Example({ file: 'src/components/$DragSort.ts' })($DragList({}))({}))
          ),

          match(examples.popover)(
            commitTitle('Popover')($Example({ file: 'src/components/$DragSort.ts' })($PopoverExample({}))({}))
          ),

          match(examples.table)(
            commitTitle('Table')($Example({ file: 'src/components/$Table.ts' })($column($TableExample({})))({}))
          ),

          match(examples.calculator)(
            commitTitle('Calculator')($Example({ file: 'src/components/$Calculator.ts' })($Calculator({}))({}))
          ),

          match(examples.virtualScroll)(
            commitTitle('Virtual Scroll')(
              $Example({ file: 'src/components/$QuantumList.ts' })($VirtualScrollExample({}))({})
            )
          ),

          match(examples.toastQueue)(
            commitTitle('Toast Queue')($Example({ file: 'src/components/$ToastQueue.ts' })($ToastQueue({}))({}))
          ),

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
              $Example({ file: 'src/components/todo-app/$TodoApp.ts' })(
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
