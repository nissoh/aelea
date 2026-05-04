import { just, merge, tap } from 'aelea/stream'
import type { IBehavior } from 'aelea/stream-extended'
import { $text, component, style } from 'aelea/ui'
import { $column, $icon, $row, designSheet, spacing } from 'aelea/ui-components'
import { palette, type Theme, theme, themeList } from 'aelea/ui-components-theme'
import { setTheme } from 'aelea/ui-components-theme-browser'
import { $defaultAnchor, $Link, commitTitle, contains, match } from 'aelea/ui-router'
import { $Picker } from '../components/$ThemePicker'
import { fadeIn } from '../components/transitions/enter'
import { $aeleaLogo } from '../elements/$icons'
import { routeSchema } from '../route'
import $MainMenu from './$MainMenu'
import $Examples from './examples/$Examples'
import $Guide from './guide/$Guide'

export default () =>
  component(([changeTheme, changeThemeTether]: IBehavior<Theme>) => {
    const rootRoute = routeSchema
    const pagesRoute = routeSchema.pages
    const guideRoute = routeSchema.pages.guide
    const examplesRoute = routeSchema.pages.examples

    // Active theme as a stream — boots from the global mutable record, then
    // updates whenever the picker emits a change. Reload tears the page down
    // before any post-change render matters, but the merge keeps the stream
    // semantics correct in case reload ever goes away.
    const currentTheme = merge(just(theme), changeTheme)

    return [
      $column(
        designSheet.main,
        designSheet.customScroll,
        style({
          backgroundColor: palette.background,
          fontFamily: `'Fira Code', system-ui, monospace`,
          backgroundImage: `radial-gradient(at center center, ${palette.horizon} 50vh, ${palette.background})`
        })
      )(
        match(rootRoute)(
          commitTitle('aelea')(
            $row(
              style({
                flex: 1,
                minHeight: '100%',
                alignContent: 'center',
                alignItems: 'center',
                placeContent: 'center',
                textAlign: 'center',
                padding: '0 30px'
              })
            )(
              fadeIn(
                $column(style({ alignItems: 'center', maxWidth: '550px' }), spacing.big)(
                  $Link({
                    route: rootRoute,
                    $anchor: $defaultAnchor(style({ display: 'block' })),
                    $content: $icon({
                      $content: style({ fill: palette.message }, $aeleaLogo),
                      width: '237px',
                      height: '115px',
                      viewBox: '0 0 147 90'
                    })
                  })({}),
                  $column(spacing.small)(
                    $text(`"aelea", is a UI Framework for reactive event programming`),
                    $text(
                      'It helps you write composable and performant building blocks by composing functional event streams'
                    )
                  ),

                  $MainMenu()({})
                )
              )
            )
          )
        ),

        contains(pagesRoute)(
          $column(
            spacing.big,
            style({
              maxWidth: '870px',
              width: '100%',
              margin: '0 auto',
              paddingBottom: '45px'
            })
          )(
            $row(style({ placeContent: 'space-between', padding: '0 15px' }))(
              $Link({
                route: rootRoute,
                $anchor: $defaultAnchor(style({ display: 'inline-flex', alignItems: 'center' })),
                $content: $icon({
                  $content: $aeleaLogo,
                  fill: palette.message,
                  width: '137px',
                  height: '115px',
                  viewBox: '0 0 147 90'
                })
              })({}),
              $MainMenu()({})
            ),
            match(guideRoute)(commitTitle('Guide')($Guide()({}))),
            contains(examplesRoute)($Examples()({}))
          )
        ),

        $Picker({ themeList, currentTheme })({
          change: changeThemeTether(
            tap(t => {
              setTheme(themeList, t)
              window.location.reload()
            })
          )
        })
      )
    ]
  })
