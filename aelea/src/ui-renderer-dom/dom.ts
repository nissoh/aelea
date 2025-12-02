import {
  disposeAll,
  disposeNone,
  disposeWith,
  empty,
  type ISink,
  type IStream,
  type ITime,
  merge,
  nullSink,
  op,
  reduce,
  SettableDisposable,
  tap
} from '@/stream'
import type { IAttributeProperties, IStyleCSS } from '@/ui'
import { createDomScheduler, setDeclarationMap, type DeclarationMap } from '@/ui'
import { DECLARATION_MAP } from './declarationMap.js'
import type { I$Node, I$Scheduler, I$Slottable, INode, INodeElementDom, ISlottable } from './types.js'

export interface IRunEnvironment {
  $rootNode: I$Node<INodeElementDom>
  scheduler: I$Scheduler
  cache: string[]
  namespace: string
  stylesheet: CSSStyleSheet
  rootAttachment?: INodeElementDom
}

class BranchEffectsSink implements ISink<INode<INodeElementDom> | ISlottable<INodeElementDom>> {
  segmentsSlotList: Map<INode<INodeElementDom> | ISlottable<INodeElementDom>, Disposable>[] = []

  constructor(
    readonly env: IRunEnvironment,
    readonly branchNode: INode<INodeElementDom>,
    readonly segmentPosition: number,
    readonly segmentsCount: number[]
  ) {}

  event(time: ITime, childNode: INode<INodeElementDom>) {
    try {
      childNode.disposable.set(
        disposeWith(nodeToRemove => {
          this.segmentsCount[this.segmentPosition]--
          const element = nodeToRemove.element as ChildNode
          element.remove?.()
          const slot = this.segmentsSlotList[this.segmentPosition]
          const disposableBranch = slot.get(nodeToRemove)
          slot.delete(nodeToRemove)
          disposableBranch?.[Symbol.dispose]()
        }, childNode)
      )
    } catch (error) {
      console.error('Failed to set disposable for node:', childNode.element.nodeName, error)
      throw new Error('Cannot append node that have already been rendered, check invalid node operations')
    }

    if (typeof childNode.style === 'object' && 'classList' in (childNode.element as Element)) {
      const selector = createStyleRule(this.env, childNode.style)
      ;(childNode.element as Element).classList.add(selector)
    }

    if (typeof childNode.stylePseudo === 'object' && 'classList' in (childNode.element as Element)) {
      for (const styleDeclaration of childNode.stylePseudo) {
        const selector = createStylePseudoRule(this.env, styleDeclaration.style, styleDeclaration.class)
        ;(childNode.element as Element).classList.add(selector)
      }
    }

    if (typeof childNode.attributes === 'object') {
      if (Object.keys(childNode.attributes).length !== 0) {
        applyAttributes(childNode.attributes, childNode.element)
      }
    }

    // Collect disposables for this specific child node
    const childDisposables: Disposable[] = []

    if (typeof childNode.styleInline === 'object' && 'style' in (childNode.element as Element)) {
      const applyInline = merge(
        ...childNode.styleInline.map(styleStream =>
          op(
            styleStream,
            tap(styleObj => {
              if (!styleObj) return
              const keys = Object.keys(styleObj)
              for (let i = 0; i < keys.length; i++) {
                const prop = keys[i] as keyof IStyleCSS
                const value = styleObj[prop]
                const target = childNode.element as any
                if (target?.style?.setProperty) {
                  target.style.setProperty(prop, value === null || value === undefined ? null : String(value))
                }
              }
            })
          )
        )
      ).run(nullSink, this.env.scheduler)

      childDisposables.push(applyInline)
    }

    if (typeof childNode.styleBehavior === 'object' && 'classList' in (childNode.element as Element)) {
      const newLocal = childNode.styleBehavior.map(sb => styleBehavior(sb, childNode, this.env))
      const disposeStyle = merge(...newLocal).run(nullSink, this.env.scheduler)

      childDisposables.push(disposeStyle)
    }

    if (typeof childNode.attributesBehavior === 'object' && childNode.attributesBehavior.length) {
      const disposeStyle = merge(
        ...childNode.attributesBehavior.map(attrs => {
          return op(
            attrs,
            tap(attr => {
              applyAttributes(attr, childNode.element)
            })
          )
        })
      ).run(nullSink, this.env.scheduler)

      childDisposables.push(disposeStyle)
    }

    let slot = 0
    for (let sIdx = 0; sIdx < this.segmentPosition; sIdx++) {
      slot += this.segmentsCount[sIdx]
    }

    const insertAt = this.branchNode.insertAscending ? slot : slot + this.segmentsCount[this.segmentPosition]

    this.segmentsCount[this.segmentPosition]++

    appendToSlot(this.branchNode.element, childNode.element, insertAt)

    const newDisp = '$segments' in childNode ? new BranchChildrenSinkList(this.env, childNode) : disposeNone

    if (!this.segmentsSlotList[this.segmentPosition]) {
      this.segmentsSlotList[this.segmentPosition] = new Map()
    }

    this.segmentsSlotList[this.segmentPosition].set(childNode, disposeAll([...childDisposables, newDisp]))
  }

  end(time: ITime) {
    // // Dispose all segment disposables
    // for (const s of this.segmentsSlotList) {
    //   for (const d of s.values()) {
    //     d[Symbol.dispose]()
    //   }
    //   s.clear() // Clear the map to release references
    // }
    // // Clear arrays to release references
    // this.segmentsSlotList.length = 0
  }

  error(time: ITime, err: unknown) {
    console.error(err)
  }
}

class BranchChildrenSinkList implements Disposable {
  disposables = new Map<I$Slottable<INodeElementDom>, Disposable>()

  constructor(
    readonly env: IRunEnvironment,
    readonly node: INode<INodeElementDom>
  ) {
    const l = node.$segments.length
    const segmentsCount = new Array(l).fill(0)

    for (let i = 0; i < l; ++i) {
      const $child = node.$segments[i]
      const sink = new BranchEffectsSink(this.env, this.node, i, segmentsCount)

      this.disposables.set($child, $child.run(sink, this.env.scheduler))
    }
  }

  [Symbol.dispose](): void {
    for (const d of this.disposables.values()) d[Symbol.dispose]()
    this.disposables.clear() // Clear the map to release references
  }
}

function styleBehavior(
  styleBehavior: IStream<IStyleCSS | null>,
  node: INode<INodeElementDom>,
  cacheService: IRunEnvironment
) {
  const element = node.element as Element
  if (!('classList' in element)) {
    return empty
  }
  return op(
    styleBehavior,
    reduce((previousCssRule: null | ReturnType<typeof createStyleRule>, styleObject) => {
      if (previousCssRule) {
        if (styleObject === null) {
          element.classList.remove(previousCssRule)
          return ''
        }

        const cashedCssClas = createStyleRule(cacheService, styleObject)

        if (previousCssRule !== cashedCssClas) {
          element.classList.replace(previousCssRule, cashedCssClas)
          return cashedCssClas
        }
      }

      if (styleObject) {
        const cashedCssClas = createStyleRule(cacheService, styleObject)

        element.classList.add(cashedCssClas)
        return cashedCssClas
      }

      return ''
    }, null)
  )
}

function styleObjectAsString(styleObj: IStyleCSS) {
  return Object.entries(styleObj)
    .map(([key, val]) => {
      const kebabCaseKey = key.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase()
      return `${kebabCaseKey}:${val};`
    })
    .join('')
}

export function createStyleRule(env: IRunEnvironment, styleDefinition: IStyleCSS) {
  const properties = styleObjectAsString(styleDefinition)
  const cachedRuleIdx = env.cache.indexOf(properties)

  if (cachedRuleIdx === -1) {
    const index = env.stylesheet.cssRules.length
    const namespace = env.namespace + index

    env.cache.push(properties)
    env.stylesheet.insertRule(`.${namespace} {${properties}}`, index)
    return `${env.namespace + index}`
  }

  return `${env.namespace + cachedRuleIdx}`
}

export function createStylePseudoRule(env: IRunEnvironment, styleDefinition: IStyleCSS, pseudo = '') {
  const properties = styleObjectAsString(styleDefinition)
  const index = env.stylesheet.cssRules.length
  const rule = `.${env.namespace + index + pseudo} {${properties}}`
  const cachedRuleIdx = env.cache.indexOf(rule)

  if (cachedRuleIdx === -1) {
    env.cache.push(rule)
    env.stylesheet.insertRule(rule, index)
    return `${env.namespace + index}`
  }

  return `${env.namespace + cachedRuleIdx}`
}

function applyAttributes(attrs: IAttributeProperties<unknown>, node: INodeElementDom) {
  if (!attrs) return node

  const element = node as Element
  if (!('setAttribute' in element)) return node

  for (const [attrKey, value] of Object.entries(attrs)) {
    if (value === undefined || value === null) {
      element.removeAttribute(attrKey)
    } else {
      element.setAttribute(attrKey, String(value))
    }
  }

  return node
}

function appendToSlot(parent: INodeElementDom, child: INodeElementDom, insertAt: number) {
  const parentNode = parent as unknown as {
    prepend?: (node: INodeElementDom) => void
    insertBefore: (node: INodeElementDom, referenceNode?: INodeElementDom | null) => void
    children?: ArrayLike<INodeElementDom>
    firstChild?: unknown
  }

  if (insertAt === 0) {
    if (parentNode.prepend) {
      parentNode.prepend(child)
    } else {
      parentNode.insertBefore(child, parentNode.firstChild as INodeElementDom | null)
    }
    return
  }

  const reference =
    parentNode.children && insertAt < parentNode.children.length
      ? (parentNode.children[insertAt] as INodeElementDom)
      : null

  parentNode.insertBefore(child, reference)
}

export function render(config: {
  rootAttachment: INodeElementDom
  $rootNode: I$Node
  scheduler?: I$Scheduler
  namespace?: string
  cache?: string[]
  declarationMap?: DeclarationMap<Node>
}): Disposable {
  if (!config.rootAttachment) {
    throw new Error('rootAttachment is required for render')
  }

  setDeclarationMap(config.declarationMap ?? (DECLARATION_MAP as DeclarationMap<Node>))

  const env: IRunEnvironment = {
    $rootNode: config.$rootNode,
    scheduler: config.scheduler ?? createDomScheduler(),
    rootAttachment: config.rootAttachment,
    cache: config.cache ?? [],
    namespace: config.namespace ?? 'Ω',
    stylesheet: new CSSStyleSheet()
  }

  // Add stylesheet to document
  document.adoptedStyleSheets = [...document.adoptedStyleSheets, env.stylesheet]

  const rootNode: INode<INodeElementDom> = {
    kind: 'wrap',
    tag: null,
    element: config.rootAttachment,
    $segments: [config.$rootNode],
    disposable: new SettableDisposable(),
    styleBehavior: [],
    styleInline: [],
    attributes: {},
    style: {},
    insertAscending: true,
    attributesBehavior: [],
    stylePseudo: []
  }

  const rootSink = new BranchChildrenSinkList(env, rootNode)

  // Return a disposable that cleans up both the sink and the stylesheet
  return {
    [Symbol.dispose](): void {
      rootSink[Symbol.dispose]()
      // Remove the stylesheet from the document
      const index = document.adoptedStyleSheets.indexOf(env.stylesheet)
      if (index !== -1) {
        document.adoptedStyleSheets = document.adoptedStyleSheets.filter(sheet => sheet !== env.stylesheet)
      }
    }
  }
}
