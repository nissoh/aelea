import { $element, $node, $text, attr, component, type I$Slottable, style, stylePseudo } from 'aelea/ui'
import { $column, $icon, $row, spacing } from 'aelea/ui-components'
import { palette, text } from 'aelea/ui-components-theme'
import { $defaultAnchor, $Link, type Route } from 'aelea/ui-router'
import { fadeIn } from '../components/transitions/enter'
import $TSPeep from '../components/typescript-notebook/$TSPeep'
import { $code, $eyebrow, $h2, $muted } from '../elements/$common'
import { $aeleaLogo, $github } from '../elements/$icons'
import { routeSchema } from '../route'

const PAGE = '1040px'
const READ = '620px'

const counterSnippet = `import { constant, map, merge, op, reduce } from 'aelea/stream'
import { $element, $text, component, type INode, nodeEvent, style } from 'aelea/ui'
import type { IBehavior } from 'aelea/stream-extended'

const $button = $element('button')(
  style({ padding: '4px 12px', cursor: 'pointer' })
)

// streams in -> DOM out -> a "count" stream back out
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

// ── atoms ────────────────────────────────────────────────────
const $logo = (width: string, height: string) =>
  $icon({ $content: style({ fill: palette.message }, $aeleaLogo), width, height, viewBox: '0 0 147 90' })

const $navLink = (label: string, route: Route) =>
  $Link({
    route,
    $content: $text(label),
    $anchor: $defaultAnchor(style({ color: palette.foreground }), stylePseudo(':hover', { color: palette.primary }))
  })({})

const $iconLink = (href: string) =>
  $element('a')(
    style({ display: 'flex', alignItems: 'center', fill: palette.foreground }),
    stylePseudo(':hover', { fill: palette.primary }),
    attr({ href })
  )($icon({ $content: $github, width: '22px', viewBox: '0 0 1024 1024' }))

const $primaryLink = (label: string, route: Route) =>
  $Link({
    route,
    $content: $text(label),
    $anchor: $defaultAnchor(
      style({
        padding: '12px 22px',
        borderRadius: '8px',
        backgroundColor: palette.primary,
        color: palette.background,
        fontWeight: 500
      }),
      stylePseudo(':hover', { filter: 'brightness(1.1)', color: palette.background })
    )
  })({})

const $ghostLink = (label: string, route: Route) =>
  $Link({
    route,
    $content: $text(label),
    $anchor: $defaultAnchor(
      style({
        padding: '12px 22px',
        borderRadius: '8px',
        border: `1px solid ${palette.middleground}`,
        color: palette.message
      }),
      stylePseudo(':hover', { borderColor: palette.primary, color: palette.primary })
    )
  })({})

// max-width band, centered, with consistent gutters
const $band = (maxWidth: string, ...content: I$Slottable[]) =>
  $column(style({ width: '100%', maxWidth, padding: '0 24px' }))(...content)

const $section = (...content: I$Slottable[]) =>
  $row(style({ justifyContent: 'center', width: '100%', padding: '88px 0' }))(
    $column(style({ width: '100%', maxWidth: PAGE, padding: '0 24px', gap: '32px' }))(...content)
  )

const $sectionHead = (title: string, ...sub: I$Slottable[]) =>
  $column(style({ maxWidth: READ, gap: '12px' }))($h2(title), ...sub)

const $feature = (index: string, title: string, body: string) =>
  $column(spacing.tiny, style({ flex: '1 1 210px', minWidth: '200px' }))(
    $node(style({ color: palette.primary, fontSize: text.sm }))($text(index)),
    $node(style({ color: palette.message, fontWeight: 500 }))($text(title)),
    $muted(body)
  )

const $flowNode = (title: string, sub: string) =>
  $column(
    spacing.tiny,
    style({
      padding: '14px 18px',
      borderRadius: '10px',
      border: `1px solid ${palette.middleground}`,
      backgroundColor: palette.horizon,
      minWidth: '150px'
    })
  )(
    $node(style({ color: palette.message, fontWeight: 500 }))($text(title)),
    $node(style({ color: palette.foreground, fontSize: text.sm }))($text(sub))
  )

const $flow = $row(spacing.default, style({ flexWrap: 'wrap', alignItems: 'center' }))(
  $flowNode('Parent', 'owns the state'),
  $column(spacing.tiny, style({ fontSize: text.sm, minWidth: '130px' }))(
    $node(style({ color: palette.primary }))($text('state  ──▶')),
    $node(style({ color: palette.foreground }))($text('◀──  change'))
  ),
  $flowNode('Child', 'pure emitter')
)

const $compareCell = (label: string, first: boolean, accent: boolean) =>
  $node(
    style({
      flex: 1,
      minWidth: '0',
      padding: '12px 16px',
      fontSize: text.sm,
      color: accent ? palette.message : palette.foreground,
      borderLeft: first ? 'none' : `1px solid ${palette.middleground}`
    })
  )($text(label))

const $compareRow = (cells: string[]) =>
  $row(style({ borderTop: `1px solid ${palette.middleground}`, lineHeight: '1.45' }))(
    ...cells.map((cell, i) => $compareCell(cell, i === 0, i === 0))
  )

const $compareHead = (labels: string[]) =>
  $row(style({ backgroundColor: palette.horizon }))(
    ...labels.map((label, i) =>
      $node(
        style({
          flex: 1,
          minWidth: '0',
          padding: '12px 16px',
          fontSize: text.sm,
          fontWeight: 600,
          color: i === 0 ? palette.primary : palette.message,
          borderLeft: i === 0 ? 'none' : `1px solid ${palette.middleground}`
        })
      )($text(label))
    )
  )

// ── page ─────────────────────────────────────────────────────
export default () =>
  component(() => [
    $column(style({ width: '100%', alignItems: 'center' }))(
      // ── hero (two-column: pitch | live counter) ─────────────
      fadeIn(
        $row(style({ justifyContent: 'center', width: '100%' }))(
          $row(
            spacing.big,
            style({
              width: '100%',
              maxWidth: PAGE,
              padding: '56px 24px 80px',
              flexWrap: 'wrap',
              alignItems: 'flex-start'
            })
          )(
            $column(spacing.default, style({ flex: '1 1 380px', minWidth: '300px', alignItems: 'flex-start' }))(
              $logo('120px', '60px'),
              $element('h1')(
                style({
                  margin: '0',
                  fontWeight: 600,
                  fontSize: 'clamp(1.7rem, 3vw, 2.25rem)',
                  lineHeight: '1.18',
                  letterSpacing: '-0.02em',
                  color: palette.message
                })
              )($text('Reactive UI as pure functions over streams')),
              $node(style({ color: palette.message, fontSize: text.lg, lineHeight: '1.6', maxWidth: '480px' }))(
                $text(
                  'Streams flow in, DOM comes out, and children emit streams back. No virtual DOM, no hidden state.'
                )
              ),
              $row(spacing.default, style({ flexWrap: 'wrap', alignItems: 'center', paddingTop: '8px' }))(
                $primaryLink('Read the Guide', routeSchema.pages.guide),
                $ghostLink('Browse Examples', routeSchema.pages.examples.theme),
                $iconLink('https://github.com/nissoh/aelea')
              ),
              $row(spacing.small, style({ alignItems: 'center', paddingTop: '2px' }))(
                $node(style({ color: palette.foreground }))($text('$')),
                $code('bun add aelea')
              )
            ),
            $column(
              style({
                flex: '1 1 440px',
                minWidth: '300px',
                width: '100%',
                borderRadius: '12px',
                border: `1px solid ${palette.middleground}`,
                overflow: 'hidden',
                boxShadow: `0 14px 36px -18px ${palette.shadow}`
              })
            )($TSPeep({ readOnly: false, code: counterSnippet })({}))
          )
        )
      ),

      // ── mental model ────────────────────────────────────────
      $section(
        $sectionHead(
          'Inputs down, outputs up',
          $muted(
            'A parent owns state and passes it down as a stream; the child renders from it and emits changes back ',
            'through a tether, which the parent merges into the source. The same loop scales to whole component trees.'
          )
        ),
        $flow
      ),

      // ── why aelea ───────────────────────────────────────────
      $section(
        $sectionHead('Why aelea'),
        $row(spacing.big, style({ width: '100%', flexWrap: 'wrap' }))(
          $feature(
            '01',
            'No virtual DOM',
            'DOM is produced directly from streams. map and switchMap swap and derive subtrees — nothing is diffed behind your back.'
          ),
          $feature(
            '02',
            'Streams are shared context',
            'state caches and replays the latest value to every observer. One source, many consumers, no refetch and no manual dedup.'
          ),
          $feature(
            '03',
            'Headless rendering',
            'Observe the same node tree off the DOM and project it to images or snapshots via the takumi entry — SSR, OG images, tests.'
          ),
          $feature(
            '04',
            'Batteries included',
            'Buttons, sliders, dropdowns, a virtual table, popovers and tooltips, a router, and a token-based theming system.'
          )
        )
      ),

      // ── coming from react ───────────────────────────────────
      $section(
        $sectionHead('Coming from React, Vue, or Svelte', $muted('The same ideas, made explicit.')),
        $node(style({ width: '100%', maxWidth: PAGE, overflowX: 'auto' }))(
          $column(
            style({
              minWidth: '620px',
              border: `1px solid ${palette.middleground}`,
              borderRadius: '12px',
              overflow: 'hidden'
            })
          )(
            $compareHead(['aelea', 'React', 'Vue', 'Svelte']),
            $compareRow(['a state stream', 'useState', 'ref', '$state']),
            $compareRow(['$element / $text', 'JSX', 'template', 'markup']),
            $compareRow(['map · combine · switchMap', 'useMemo / useEffect', 'computed / watch', '$derived / $effect']),
            $compareRow(['parent owns, child emits', 'lift state up', 'emit / provide', 'stores / props'])
          )
        )
      ),

      // ── footer ──────────────────────────────────────────────
      $row(style({ justifyContent: 'center', width: '100%', borderTop: `1px solid ${palette.middleground}` }))(
        $band(
          PAGE,
          $row(
            spacing.big,
            style({ flexWrap: 'wrap', justifyContent: 'space-between', padding: '48px 0', width: '100%' })
          )(
            $column(spacing.small, style({ maxWidth: '320px' }))(
              $logo('72px', '34px'),
              $muted('Reactive UI as pure functions over streams. MIT licensed.'),
              $node(style({ color: palette.foreground, fontSize: text.sm }))(
                $text('Made by '),
                $element('a')(
                  style({ color: palette.message }),
                  stylePseudo(':hover', { color: palette.primary }),
                  attr({ href: 'https://ceci.help' })
                )($text('ceci.help'))
              )
            ),
            $row(spacing.big, style({ flexWrap: 'wrap' }))(
              $column(spacing.small)(
                $eyebrow('Docs'),
                $navLink('Guide', routeSchema.pages.guide),
                $navLink('Examples', routeSchema.pages.examples.theme)
              ),
              $column(spacing.small)(
                $eyebrow('Project'),
                $element('a')(
                  style({ color: palette.foreground }),
                  stylePseudo(':hover', { color: palette.primary }),
                  attr({ href: 'https://github.com/nissoh/aelea' })
                )($text('GitHub')),
                $element('a')(
                  style({ color: palette.foreground }),
                  stylePseudo(':hover', { color: palette.primary }),
                  attr({ href: 'https://www.npmjs.com/package/aelea' })
                )($text('npm'))
              )
            )
          )
        )
      )
    )
  ])
