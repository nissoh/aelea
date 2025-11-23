import { type IStream, map, merge, reduce, switchLatest } from 'aelea/stream'
import { behavior, type IBehavior } from 'aelea/stream-extended'
import { $text, component, style } from 'aelea/ui'
import { $Button, $card, $column, $row, spacing } from 'aelea/ui-components'
import { pallete } from 'aelea/ui-components-theme'

type ToastKind = 'info' | 'success' | 'warn'

interface Toast {
  id: string
  kind: ToastKind
  message: string
}

const kindPalette: Record<ToastKind, string> = {
  info: pallete.message,
  success: pallete.positive,
  warn: pallete.negative
}

const randomId = () => Math.random().toString(36).slice(2, 8)
const pick = <T>(items: readonly T[]) => items[Math.floor(Math.random() * items.length)]

const messages = [
  'Stream wired',
  'State updated',
  'Side-effect free',
  'Composable UI',
  'Async handled',
  'Optimistic'
] as const

const createToast = (kind: ToastKind): Toast => ({
  id: randomId(),
  kind,
  message: pick(messages)
})

export const $ToastQueue = component(
  (
    [addToast, _addToastTether]: IBehavior<Toast, Toast>,
    [dismissToast, dismissToastTether]: IBehavior<PointerEvent, string>,
    [clearAll, clearAllTether]: IBehavior<PointerEvent, PointerEvent>
  ) => {
    const [seedClick, seedClickTether] = behavior<PointerEvent, PointerEvent>()
    const [infoClick, infoClickTether] = behavior<PointerEvent, PointerEvent>()
    const [successClick, successClickTether] = behavior<PointerEvent, PointerEvent>()
    const [warnClick, warnClickTether] = behavior<PointerEvent, PointerEvent>()

    const toastAdds = merge(
      map(() => createToast('info'), seedClick),
      addToast,
      map(() => createToast('info'), infoClick),
      map(() => createToast('success'), successClick),
      map(() => createToast('warn'), warnClick)
    )

    type ToastEvent = { type: 'add'; toast: Toast } | { type: 'dismiss'; id: string } | { type: 'clear' }

    const toastEvents = merge(
      map(toast => ({ type: 'add', toast }), toastAdds),
      map(id => ({ type: 'dismiss', id }), dismissToast),
      map(() => ({ type: 'clear' }), clearAll)
    ) as unknown as IStream<ToastEvent>

    const toasts = reduce<ToastEvent, Toast[]>(
      (list, event) => {
        if (event.type === 'add') return [...list, event.toast]
        if (event.type === 'dismiss') return list.filter(t => t.id !== event.id)
        return []
      },
      [],
      toastEvents
    )

    return [
      $column(spacing.big)(
        $text('Toast queue built with stream reducers and behavior tethers.'),
        $row(spacing.small)(
          $Button({ $content: $text('Seed Toast') })({
            click: seedClickTether()
          }),
          $Button({ $content: $text('Add Info') })({
            click: infoClickTether()
          }),
          $Button({ $content: $text('Add Success') })({
            click: successClickTether()
          }),
          $Button({ $content: $text('Add Warn') })({
            click: warnClickTether()
          }),
          $Button({ $content: $text('Clear All') })({
            click: clearAllTether()
          })
        ),

        switchLatest(
          map(
            list =>
              list.length === 0
                ? $card(style({ padding: '12px', color: pallete.foreground }))($text('No toasts yet.'))
                : $column(spacing.small)(
                    ...list.map(toast =>
                      $card(
                        style({
                          borderLeft: `4px solid ${kindPalette[toast.kind]}`,
                          padding: '10px 14px',
                          backgroundColor: pallete.background
                        })
                      )(
                        $row(style({ alignItems: 'center', placeContent: 'space-between', gap: '12px' }))(
                          $column(spacing.tiny)($text(`${toast.kind.toUpperCase()}`), $text(`${toast.message}`)),
                          $Button({ $content: $text('Dismiss') })({
                            click: dismissToastTether(map(() => toast.id) as any)
                          })
                        )
                      )
                    )
                  ),
            toasts
          )
        )
      )
    ]
  }
)
