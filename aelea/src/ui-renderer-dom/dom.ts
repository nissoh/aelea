import { disposeAll, disposeNone, disposeWith, merge, nullSink, op, tap, type IStream } from '@/stream'
import { createDomScheduler } from '@/ui'
import type {
  I$Node,
  I$Scheduler,
  I$Slottable,
  IAttributeProperties,
  INode,
  INodeElementDom,
  IStyleCSS,
  ITextNode
} from './types.js'

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

function renderSlot(
  $slot: I$Slottable<INodeElementDom>,
  parent: Element,
  env: { scheduler: I$Scheduler }
): Disposable {
  return $slot.run(
    {
      event(time, nodeOrText) {
        let el: Node
        let childDisposables: Disposable | null = null

        if ('kind' in nodeOrText && nodeOrText.kind === 'text') {
          el = document.createTextNode('')
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
          const element = node.element
          el = element
          applyStaticStyle(node.style, element)
          applyAttributes(node.attributes, element)

          const pseudoDisp =
            node.stylePseudo.length === 0
              ? disposeNone
              : (() => {
                  const classes: string[] = []
                  for (const entry of node.stylePseudo) {
                    const cls = createStylePseudoRule(entry.class, entry.style)
                    classes.push(cls)
                    element.classList?.add(cls)
                  }
                  return disposeWith(() => {
                    for (const cls of classes) {
                      element.classList?.remove(cls)
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
                        applyStaticStyle(styleObj ?? {}, element)
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
                        applyStaticStyle(styleObj ?? {}, element)
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
                        applyAttributes(attr, element)
                      })
                    )
                  )
                ).run(nullSink, env.scheduler)

          childDisposables = disposeAll([styleInlineDisp, styleClass, attrBeh, pseudoDisp, propDisp])

          const segmentDisposables = node.$segments.map(seg => renderSlot(seg, element, env))
          childDisposables = disposeAll([childDisposables, ...segmentDisposables].filter(Boolean) as Disposable[])
        }

        parent.appendChild(el)
      },
      error(_t, err) {
        console.error('render slot error', err)
      },
      end() {}
    },
    env.scheduler
  ) as unknown as Disposable
}

export function render(config: { rootAttachment: Element; $rootNode: I$Node; scheduler?: I$Scheduler }): Disposable {
  const env = {
    scheduler: config.scheduler ?? createDomScheduler()
  }

  const disposable = renderSlot(config.$rootNode as any, config.rootAttachment, env)

  return {
    [Symbol.dispose]() {
      disposable?.[Symbol.dispose]?.()
    }
  }
}
