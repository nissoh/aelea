import { $node, $text, attr, component, style } from 'aelea/ui'
import { $column, spacing } from 'aelea/ui-components'
import { palette } from 'aelea/ui-components-theme'
import $TSPeep from '../../components/typescript-notebook/$TSPeep'
import { $anchor, $eyebrow, $h2, $muted } from '../../elements/$common'

const $live = (code: string) => $TSPeep({ readOnly: false, code })({})

const $step = (eyebrow: string, title: string, $body: ReturnType<typeof $muted>, code: string) =>
  $column(spacing.default, style({ width: '100%' }))($eyebrow(eyebrow), $h2(title), $body, $live(code))

export default () =>
  component(() => [
    $column(
      style({
        flex: 1,
        alignItems: 'stretch',
        maxWidth: '760px',
        margin: '0 auto',
        width: '100%',
        padding: '24px',
        gap: '64px'
      })
    )(
      $column(spacing.small)(
        $eyebrow("Developer's Guide"),
        $h2('Build UI by composing streams'),
        $node(style({ color: palette.foreground, lineHeight: '1.6' }))(
          $text(
            'aelea components are pure functions: streams flow in, DOM comes out, and children emit streams back. '
          ),
          $text('Every snippet below compiles and runs in your browser — edit it and watch it re-render. A little '),
          $anchor(attr({ href: 'https://mostcore.readthedocs.io/en/latest/index.html' }))($text('@most/core')),
          $text(' familiarity helps, but is not required.')
        )
      ),

      $step(
        'Step 1 — primitives',
        'Elements, text, and style',
        $muted(
          'Element factories like $element and $node return composable nodes; decorators such as style attach onto them ',
          'by call. $text turns a string into a text node. Nothing here is reactive yet — just a DOM tree as a value.'
        ),
        `import { $element, $text, style } from 'aelea/ui'

const $box = $element('div')(
  style({ padding: '16px', borderRadius: '8px', border: '1px solid #4c8bf5' })
)

export default $box($text('Hello aelea'))`
      ),

      $step(
        'Step 2 — reactivity',
        'Text that updates itself',
        $muted(
          'Give $text a stream instead of a string and it updates a single text node in place. Here periodic ticks ',
          'every second and reduce folds those ticks into a running count — no setState, no re-render, just a stream.'
        ),
        `import { map, op, periodic, reduce } from 'aelea/stream'
import { $text } from 'aelea/ui'

const seconds = op(periodic(1000), reduce(n => n + 1, 0))

export default $text(op(seconds, map(n => \`Elapsed: \${n}s\`)))`
      ),

      $step(
        'Step 3 — components',
        'Events in, state out',
        $muted(
          'component receives behaviors — [stream, tether] tuples. A tether wires a DOM event into its stream; the ',
          'stream is yours to transform. Two click streams merge into a delta, and reduce folds them into the count.'
        ),
        `import { constant, map, merge, op, reduce } from 'aelea/stream'
import { $element, $text, component, type INode, nodeEvent, style } from 'aelea/ui'
import type { IBehavior } from 'aelea/stream-extended'

const $button = $element('button')(style({ padding: '4px 12px', cursor: 'pointer' }))

export default component((
  [inc, incTether]: IBehavior<INode, MouseEvent>,
  [dec, decTether]: IBehavior<INode, MouseEvent>
) => {
  const count = op(
    merge(constant(1, inc), constant(-1, dec)),
    reduce((sum, n) => sum + n, 0)
  )

  return [
    $element('div')(style({ display: 'flex', gap: '12px', alignItems: 'center' }))(
      $button(decTether(nodeEvent('click')))($text('-')),
      $text(op(count, map(String))),
      $button(incTether(nodeEvent('click')))($text('+'))
    )
  ]
})({})`
      ),

      $step(
        'Step 4 — deriving DOM',
        'Swapping subtrees with switchMap',
        $muted(
          'For reactive text, prefer $text(stream). To swap between different node shapes, return them from switchMap: ',
          'each emission disposes the previous subtree and mounts the next, instead of stacking them.'
        ),
        `import { op, reduce, switchMap } from 'aelea/stream'
import { $element, $node, $text, component, type INode, nodeEvent, style } from 'aelea/ui'
import type { IBehavior } from 'aelea/stream-extended'

export default component((
  [toggle, toggleTether]: IBehavior<INode, MouseEvent>
) => {
  const on = op(toggle, reduce(prev => !prev, false))

  return [
    $node(style({ display: 'flex', flexDirection: 'column', gap: '10px' }))(
      $element('button')(style({ padding: '4px 12px', cursor: 'pointer' }), toggleTether(nodeEvent('click')))(
        $text('Toggle')
      ),
      op(on, switchMap(isOn => isOn
        ? $node(style({ color: 'limegreen' }))($text('on'))
        : $node(style({ color: 'gray' }))($text('off'))))
    )
  ]
})({})`
      ),

      $column(spacing.small, style({ paddingTop: '8px' }))(
        $eyebrow('Next'),
        $node(style({ color: palette.foreground, lineHeight: '1.6' }))(
          $text('Parents own state, children stay pure: state flows down as a stream, changes flow up through a '),
          $text('tether, and the parent merges them back into the source. See that pattern at work in the '),
          $anchor(attr({ href: '#p/examples/count-counters' }))($text('examples')),
          $text(', or read the primitives in '),
          $anchor(attr({ href: 'https://github.com/nissoh/aelea' }))($text('the source')),
          $text('.')
        )
      )
    )
  ])
