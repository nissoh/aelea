import { disposeAll, disposeNone, disposeWith, type IStream, merge, nullSink, op, tap } from '@/stream'
import type {
  EventDescriptor,
  I$Node,
  I$Scheduler,
  IAttributeProperties,
  INode,
  ISlottable,
  IStyleCSS,
  ITextNode
} from '@/ui'
import { createDomScheduler } from '@/ui'
import { DECLARATION_MAP } from './declarationMap.js'
import type { INodeElementDom } from './types.js'

const STYLE_TAG_ID = '__aelea_style__'
let ruleCounter = 0
let styleSheet: CSSStyleSheet | null = null

function ensureStyleSheet(): CSSStyleSheet | null {
  if (styleSheet) return styleSheet
  if (typeof document === 'undefined') return null
  let tag = document.getElementById(STYLE_TAG_ID) as HTMLStyleElement | null
  if (!tag) {
    tag = document.createElement('style')
    tag.id = STYLE_TAG_ID
    document.head.appendChild(tag)
  }
  styleSheet = tag.sheet as CSSStyleSheet | null
  return styleSheet
}

const toKebab = (prop: string) => prop.replace(/[A-Z]/g, match => `-${match.toLowerCase()}`)
const styleToCss = (style: IStyleCSS) =>
  Object.entries(style)
    .filter(([, v]) => v !== undefined && v !== null)
    .map(([k, v]) => `${toKebab(k)}:${String(v)};`)
    .join('')

export function createStyleRule(style: IStyleCSS): string {
  const sheet = ensureStyleSheet()
  const className = `ae-${++ruleCounter}`
  const cssText = `.${className}{${styleToCss(style)}}`
  sheet?.insertRule(cssText, sheet.cssRules.length)
  return className
}

export function createStylePseudoRule(pseudo: string, style: IStyleCSS): string {
  const sheet = ensureStyleSheet()
  const className = `ae-${++ruleCounter}`
  const cssText = `.${className}${pseudo}{${styleToCss(style)}}`
  sheet?.insertRule(cssText, sheet.cssRules.length)
  return className
}

interface IRunEnvironment {
  scheduler: I$Scheduler
  declarationMap: typeof DECLARATION_MAP
}

function applyAttributes(attrs: IAttributeProperties<unknown> | null | undefined, element: INodeElementDom) {
  if (!attrs) return
  const el = element as Element
  if (!el.setAttribute) return
  for (const [k, v] of Object.entries(attrs)) {
    if (v === null || v === undefined) {
      el.removeAttribute(k)
    } else {
      el.setAttribute(k, String(v))
    }
  }
}

function applyStaticStyle(style: IStyleCSS, element: INodeElementDom) {
  const el = element as any
  if (!el?.style?.setProperty) return
  for (const [k, v] of Object.entries(style)) {
    el.style.setProperty(k, v === null || v === undefined ? null : String(v))
  }
}

function bindEvents(events: EventDescriptor[], element: INodeElementDom, scheduler: I$Scheduler) {
  const el = element as any
  const disposables: Disposable[] = []
  for (const entry of events) {
    const handler = (ev: any) => {
      const time = scheduler.time()
      for (const sink of entry.sinks) {
        sink.event(time, ev)
      }
    }
    el.addEventListener?.(entry.type, handler, entry.options as any)
    disposables.push(
      disposeWith(() => {
        el.removeEventListener?.(entry.type, handler, entry.options as any)
      })
    )
  }
  return disposeAll(disposables)
}

function createElement(kind: string, tag: string | null, map: typeof DECLARATION_MAP): INodeElementDom {
  if (kind === 'svg') return map.svg(tag ?? 'svg')
  if (kind === 'custom') return map.custom(tag ?? 'div')
  if (kind === 'node') return map.node()
  if (kind === 'wrap') return map.wrap(map.node())
  return map.element(tag ?? 'div')
}

function renderSlot(
  $slot: IStream<ISlottable<INodeElementDom>>,
  parent: Element,
  env: IRunEnvironment,
  segmentIndex: number
): Disposable {
  return $slot.run(
    {
      event(time, nodeOrText) {
        let el: INodeElementDom
        let childDisposables: Disposable | null = null

        if ('kind' in nodeOrText && nodeOrText.kind === 'text') {
          el = env.declarationMap.text ? env.declarationMap.text('') : document.createTextNode('')
          const source = (nodeOrText as ITextNode).value
          if (typeof source === 'string') {
            ;(el as any).nodeValue = source ?? ''
          } else if (source) {
            childDisposables = op(
              source as IStream<string>,
              tap(val => {
                ;(el as any).nodeValue = val ?? ''
              })
            ).run(nullSink, env.scheduler)
          }
        } else {
          const node = nodeOrText as INode<INodeElementDom>
          el = createElement(node.kind, node.tag, env.declarationMap)
          applyStaticStyle(node.style, el)
          applyAttributes(node.attributes, el)

          const pseudoDisp =
            node.stylePseudo.length === 0
              ? disposeNone
              : (() => {
                  const classes: string[] = []
                  for (const entry of node.stylePseudo) {
                    const cls = createStylePseudoRule(entry.class, entry.style)
                    classes.push(cls)
                    ;(el as Element)?.classList?.add(cls)
                  }
                  return disposeWith(() => {
                    for (const cls of classes) {
                      ;(el as Element)?.classList?.remove(cls)
                    }
                  })
                })()

          const propDisp =
            node.propBehavior.length === 0
              ? disposeNone
              : merge(
                  ...node.propBehavior.map(({ key, value }) =>
                    op(
                      value,
                      tap(v => {
                        ;(el as any)[key] = v
                      })
                    )
                  )
                ).run(nullSink, env.scheduler)

          const styleInlineDisp =
            node.styleInline.length === 0
              ? disposeNone
              : merge(
                  ...node.styleInline.map(sb =>
                    op(
                      sb,
                      tap(styleObj => {
                        applyStaticStyle(styleObj ?? {}, el)
                      })
                    )
                  )
                ).run(nullSink, env.scheduler)

          const styleClass =
            node.styleBehavior.length === 0
              ? disposeNone
              : merge(
                  ...node.styleBehavior.map(sb =>
                    op(
                      sb,
                      tap(styleObj => {
                        applyStaticStyle(styleObj ?? {}, el)
                      })
                    )
                  )
                ).run(nullSink, env.scheduler)

          const attrBeh =
            node.attributesBehavior.length === 0
              ? disposeNone
              : merge(
                  ...node.attributesBehavior.map(attrs =>
                    op(
                      attrs,
                      tap(attr => {
                        applyAttributes(attr, el)
                      })
                    )
                  )
                ).run(nullSink, env.scheduler)

          childDisposables = disposeAll([styleInlineDisp, styleClass, attrBeh, pseudoDisp, propDisp])

          const eventsDisp = bindEvents(node.events, el, env.scheduler)
          childDisposables = disposeAll([childDisposables, eventsDisp].filter(Boolean) as Disposable[])

          const segmentDisposables: Disposable[] = []
          const segmentsCount = node.$segments.length
          for (let i = 0; i < segmentsCount; i++) {
            const seg = node.$segments[i]
            const d = renderSlot(seg, el as Element, env, i)
            segmentDisposables.push(d)
          }
          childDisposables = disposeAll([childDisposables, ...segmentDisposables].filter(Boolean) as Disposable[])
        }

        parent.appendChild(el as any)
      },
      error(_t, err) {
        console.error('render slot error', err)
      },
      end() {}
    },
    env.scheduler
  ) as unknown as Disposable
}

export function render(config: {
  rootAttachment: Element
  $rootNode: I$Node
  scheduler?: I$Scheduler
  declarationMap?: typeof DECLARATION_MAP
}): Disposable {
  const env: IRunEnvironment = {
    scheduler: config.scheduler ?? createDomScheduler(),
    declarationMap: config.declarationMap ?? DECLARATION_MAP
  }

  const rootNode: INode = {
    kind: 'wrap',
    tag: null,
    $segments: [config.$rootNode as any],
    insertAscending: true,
    style: {},
    styleBehavior: [],
    styleInline: [],
    stylePseudo: [],
    attributes: {},
    attributesBehavior: [],
    propBehavior: [],
    events: []
  }

  const disposable = renderSlot(rootNode.$segments[0] as any, config.rootAttachment, env, 0)

  return {
    [Symbol.dispose]() {
      disposable?.[Symbol.dispose]?.()
    }
  }
}
