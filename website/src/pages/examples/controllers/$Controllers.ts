import { constant, just, map, merge, reduce, start } from 'aelea/stream'
import type { IBehavior } from 'aelea/stream-extended'
import { $node, $text, component, style } from 'aelea/ui'
import {
  $Button,
  $ButtonIcon,
  $Checkbox,
  $column,
  $Dropdown,
  $defaultSliderThumb,
  $Input,
  $icon,
  $Popover,
  $row,
  $Slider,
  $TextField,
  $Tooltip,
  spacing
} from 'aelea/ui-components'
import { palette, text } from 'aelea/ui-components-theme'
import { $trash } from '../../../elements/$icons'

const $sectionTitle = $node(
  style({ color: palette.foreground, fontSize: text.sm, textTransform: 'uppercase', letterSpacing: '0.05em' })
)

const $valueLabel = $node(style({ color: palette.foreground, fontSize: text.sm }))

const $section = (title: string, ...children: ReturnType<typeof $row>[]) =>
  $column(spacing.default, style({ minWidth: '320px' }))($sectionTitle($text(title)), ...children)

export const $Controllers = component(
  (
    [buttonClick, buttonClickTether]: IBehavior<PointerEvent, PointerEvent>,
    [iconClick, iconClickTether]: IBehavior<PointerEvent, PointerEvent>,
    [check, checkTether]: IBehavior<boolean, boolean>,
    [slide, slideTether]: IBehavior<number, number>,
    [inputChange, inputChangeTether]: IBehavior<string, string>,
    [textFieldChange, textFieldChangeTether]: IBehavior<string, string>,
    [pickFruit, pickFruitTether]: IBehavior<string, string>,
    [popOpen, popOpenTether]: IBehavior<PointerEvent, PointerEvent>
  ) => {
    const buttonCount = reduce((n: number) => n + 1, 0, buttonClick)
    const iconCount = reduce((n: number) => n + 1, 0, iconClick)
    const popCount = reduce((n: number) => n + 1, 0, popOpen)
    const checkState = start(false, check)
    const sliderValue = start(0.5, slide)
    const inputValue = start('', inputChange)
    const textFieldValue = start('', textFieldChange)
    const pickedFruit = start('—', pickFruit)

    const fruits = ['Apple', 'Banana', 'Cherry', 'Durian', 'Elderberry'] as const

    return [
      $column(spacing.big, style({ padding: '24px', flex: 1 }))(
        $row(spacing.big, style({ flexWrap: 'wrap' }))(
          $section(
            'Button',
            $row(spacing.default, style({ alignItems: 'center' }))(
              $Button({ $content: $text('Click me') })({
                click: buttonClickTether()
              }),
              $valueLabel($text(map(n => `clicks: ${n}`, start(0, buttonCount))))
            )
          ),

          $section(
            'ButtonIcon',
            $row(spacing.default, style({ alignItems: 'center' }))(
              $ButtonIcon({ $content: $icon({ $content: $trash, width: '24px', viewBox: '0 0 24 24' }) })({
                click: iconClickTether()
              }),
              $valueLabel($text(map(n => `clicks: ${n}`, start(0, iconCount))))
            )
          ),

          $section(
            'Checkbox',
            $row(spacing.default, style({ alignItems: 'center' }))(
              $Checkbox({ value: checkState, label: 'Accept terms' })({
                check: checkTether()
              }),
              $valueLabel($text(map(v => `checked: ${v}`, checkState)))
            )
          ),

          $section(
            'Slider',
            $row(spacing.default, style({ alignItems: 'center' }))(
              $node(style({ width: '180px' }))(
                $Slider({
                  value: sliderValue,
                  min: just(0),
                  max: just(1),
                  step: 0.01,
                  $thumb: $defaultSliderThumb
                })({
                  change: slideTether()
                })
              ),
              $valueLabel($text(map(v => v.toFixed(2), sliderValue)))
            )
          ),

          $section(
            'Input',
            $row(spacing.default, style({ alignItems: 'center' }))(
              $Input({ value: just('') })({
                change: inputChangeTether()
              }),
              $valueLabel($text(map(v => `"${v}"`, inputValue)))
            )
          ),

          $section(
            'TextField',
            $TextField({ label: 'Username', value: just(''), hint: 'Letters and numbers' })({
              change: textFieldChangeTether()
            }),
            $valueLabel($text(map(v => `"${v}"`, textFieldValue)))
          ),

          $section(
            'Dropdown',
            $row(spacing.default, style({ alignItems: 'center' }))(
              $Dropdown({ optionList: fruits })({
                select: pickFruitTether()
              }),
              $valueLabel($text(map(v => `selected: ${v}`, pickedFruit)))
            )
          ),

          $section(
            'Popover',
            $row(spacing.default, style({ alignItems: 'center' }))(
              $Popover({
                $target: $ButtonIcon({
                  $content: $icon({ $content: $trash, width: '24px', viewBox: '0 0 24 24' })
                })({
                  click: popOpenTether()
                }),
                $open: constant(
                  $column(spacing.default, style({ minWidth: '200px' }))(
                    $node(style({ color: palette.message, fontWeight: 'bold' }))($text('Confirm delete?')),
                    $node(style({ color: palette.foreground, fontSize: text.sm }))(
                      $text('Click outside to dismiss this popover.')
                    )
                  ),
                  popOpen
                )
              })({}),
              $valueLabel($text(map(n => `opened: ${n}`, start(0, popCount))))
            )
          ),

          $section(
            'Tooltip',
            $row(
              spacing.default,
              style({ alignItems: 'center' })
            )(
              $Tooltip({
                $anchor: $node(
                  style({
                    padding: '8px 14px',
                    border: `1px solid ${palette.horizon}`,
                    borderRadius: '6px'
                  })
                )($text('Hover me')),
                $content: $node(
                  $text(
                    'Tooltips are reactive panels that appear on hover (or tap on touch devices). They reposition when the anchor moves into view.'
                  )
                )
              })({})
            )
          )
        ),

        // Combined output stream — proves reactive composition across controllers.
        $column(
          spacing.tiny,
          style({
            marginTop: '12px',
            padding: '12px 16px',
            borderTop: `1px solid ${palette.horizon}`,
            color: palette.foreground,
            fontSize: text.sm
          })
        )(
          $text('Live event log'),
          $node(style({ color: palette.message }))(
            $text(
              start(
                'waiting…',
                merge(
                  map(() => 'button clicked', buttonClick),
                  map(() => 'icon clicked', iconClick),
                  map(v => `checkbox → ${v}`, check),
                  map(v => `slider → ${v.toFixed(2)}`, slide),
                  map(v => `input → "${v}"`, inputChange),
                  map(v => `text field → "${v}"`, textFieldChange),
                  map(v => `dropdown → ${v}`, pickFruit),
                  map(() => 'popover opened', popOpen)
                )
              )
            )
          )
        )
      )
    ]
  }
)
