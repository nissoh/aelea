import { $Branch, $Node, IAttrProperties, IBranch, IBranchElement, INode, INodeElement, RunEnvironment, StyleCSS, StyleEnvironment } from './types'
import { Disposable, Sink, Stream, Time } from '@most/types'
import { newDefaultScheduler } from '@most/scheduler'
import { loop, map, mergeArray, tap } from '@most/core'
import { disposeAll, disposeNone, disposeWith } from '@most/disposable'
import { useStylePseudoRule, useStyleRule } from './utils/styleUtils'
import { nullSink } from '@aelea/core'
import { SettableDisposable } from './utils/SettableDisposable'



function appendToSlot(parent: IBranchElement, child: INodeElement, insertAt: number) {
  if (insertAt === 0) return parent.prepend(child)

  parent.insertBefore(child, parent.children[insertAt])
}

export function runBrowser(config: Partial<RunEnvironment> = {}) {

  const composedConfig: RunEnvironment = {
    style: {
      namespace: '•',
      stylesheet: new CSSStyleSheet(),
      cache: []
    },
    rootNode: document.body,
    scheduler: newDefaultScheduler(),
    ...config
  }

  document.adoptedStyleSheets = [
    ...document.adoptedStyleSheets,
    composedConfig.style.stylesheet,
  ]

  const rootNode: IBranch = {
    element: composedConfig.rootNode,
    $segments: [],
    disposable: new SettableDisposable(),
    styleBehavior: [],
    insertAscending: true,
    attributesBehavior: [],
    stylePseudo: []
  }
 
  return ($root: $Branch) => {
    const s = new BranchEffectsSink(composedConfig, rootNode, 0, [0])

    map(node => ({ ...node, segmentPosition: 0 }), $root)
      .run(s, composedConfig.scheduler)
  }
}


class BranchEffectsSink implements Sink<IBranch | INode> {
  disposables: Disposable[] = []

  segmentsSlotsMap: Map<IBranch | INode, Disposable>[] = []

  constructor(private env: RunEnvironment,
              private parentNode: IBranch,
              private segmentPosition: number,
              private segmentsCount: number[]) { }

  event(_: Time, node: INode | IBranch) {

    try {
      node?.disposable.setDisposable(
        disposeWith(node => { 
          this.segmentsCount[this.segmentPosition]--
          node.element.remove()
          const slot = this.segmentsSlotsMap[this.segmentPosition]
          const disposableBranch = slot.get(node)
          slot.delete(node)
          disposableBranch?.dispose()

        }, node)
      )
    } catch (e) {
      console.error(node.element.nodeName)
      throw new Error(`Cannot append node that have already been rendered, check invalid node operations under ^`)
    }


    let slot = 0

    for (let sIdx = 0; sIdx < this.segmentPosition; sIdx++) {
      slot += this.segmentsCount[sIdx]
    }

    const insertAt = this.parentNode.insertAscending
      ? slot
      : slot + this.segmentsCount[this.segmentPosition]

    appendToSlot(this.parentNode.element, node.element, insertAt)

    this.segmentsCount[this.segmentPosition]++


    if ('style' in node && node.style && Object.keys(node.style).length) {
      const selector = useStyleRule(this.env.style, node.style)
      node.element.classList.add(selector)
    }

    if ('stylePseudo' in node) {
      node.stylePseudo.forEach(styleDeclaration => {
        const selector = useStylePseudoRule(this.env.style, styleDeclaration.style, styleDeclaration.class)
        node.element.classList.add(selector)
      })
    }

    if ('attributes' in node && node.attributes) {
      if (Object.keys(node.attributes).length !== 0) {
        applyAttrFn(node.attributes, node.element)
      }
    }

    if ('styleBehavior' in node && node.styleBehavior) {
      const disposeStyle = mergeArray(
        node.styleBehavior.map(sb => styleBehavior(sb, node, this.env.style))
      ).run(nullSink, this.env.scheduler)

      this.disposables.push(disposeStyle)
    }

    if ('attributesBehavior' in node && node.attributesBehavior) {
      const disposeStyle = mergeArray(
        node.attributesBehavior.map(attrs => {
          return tap((attr) => {
            applyAttrFn(attr, node.element)
          }, attrs)
        })
      ).run(nullSink, this.env.scheduler)

      this.disposables.push(disposeStyle)
    }


    const newDisp = '$segments' in node
      ? new BranchChildrenSinkList(node.$segments, this.env, node)
      : disposeNone()

    if (!this.segmentsSlotsMap[this.segmentPosition]) {
      this.segmentsSlotsMap[this.segmentPosition] = new Map()
    }

    this.segmentsSlotsMap[this.segmentPosition].set(node, disposeAll([...this.disposables, newDisp]))
    
  }

  end(_t: Time) {
    this.segmentsSlotsMap.forEach(s => {
      s.forEach(d => d.dispose())
    })
  }

  error(t: Time, err: Error) {
    console.error(err)
  }

}

class BranchChildrenSinkList implements Disposable {
  disposables = new Map<$Node<INodeElement>, Disposable>()

  constructor($segments: $Node<INodeElement>[], private env: RunEnvironment, private node: IBranch) {

    const l = $segments.length
    const segmentsCount = new Array(l).fill(0)

    for (let i = 0; i < l; ++i) {
      const $child = $segments[i]
      const sink = new BranchEffectsSink(this.env, node, i, segmentsCount)

      this.disposables.set($child, $child.run(sink, this.env.scheduler))
    }

  }

  dispose(): void {
    this.disposables.forEach(d => d.dispose())
  }
}


function styleBehavior(styleBehavior: Stream<StyleCSS | null>, node: IBranch, cacheService: StyleEnvironment) {

  let latestClass: string

  return loop(
    (previousCssRule: null | ReturnType<typeof useStyleRule>, styleObject) => {

      if (previousCssRule) {
        if (styleObject === null) {
          node.element.classList.remove(previousCssRule)

          return { seed: null, value: '' }
        } else {
          const cashedCssClas = useStyleRule(cacheService, styleObject)

          if (previousCssRule !== cashedCssClas) {
            node.element.classList.replace(latestClass, cashedCssClas)
            latestClass = cashedCssClas

            return { seed: cashedCssClas, value: cashedCssClas }
          }
        }
      }

      if (styleObject) {
        const cashedCssClas = useStyleRule(cacheService, styleObject)

        node.element.classList.add(cashedCssClas)
        latestClass = cashedCssClas

        return { seed: cashedCssClas, value: cashedCssClas }
      }

      return { seed: previousCssRule, value: '' }
    },
    null,
    styleBehavior
  )
}



export function applyAttrFn(attrs: IAttrProperties<unknown>, node: IBranchElement) {
  if (attrs) {
    Object.entries(attrs).forEach(([attrKey, value]) => {
      if (value === undefined || value === null) {
        node.removeAttribute(attrKey)
      } else {
        node.setAttribute(attrKey, String(value))
      }
    })
  }

  return node
}
