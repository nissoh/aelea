import { $Branch, $Node, IAttrProperties, IBranch, IBranchElement, INode, INodeElement, RunEnvironment, StyleCSS, StyleEnvironment } from './types'
import { Disposable, Sink, Stream, Time } from '@most/types'
import { newDefaultScheduler } from '@most/scheduler'
import { loop, map, mergeArray, tap } from '@most/core'
import { disposeNone, disposeWith } from '@most/disposable'
import { useStylePseudoRule, useStyleRule } from './utils/styleUtils'
import { nullSink } from './utils'


function appendToSlot(parent: IBranchElement, child: INodeElement, insertAt: number) {
  if (insertAt === 0) return parent.prepend(child)

  parent.insertBefore(child, parent.children[insertAt])
}

declare global {
  interface Document {
    adoptedStyleSheets: CSSStyleSheet[];
  }
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

  document.adoptedStyleSheets = [...document.adoptedStyleSheets, composedConfig.style.stylesheet]

 
  return ($root: $Branch) => {
    const s = new BranchEffectsSink(composedConfig, composedConfig.rootNode, 0, [0])

    map(node => ({ ...node, segmentPosition: 0 }), $root)
      .run(s, composedConfig.scheduler)
  }
}


class BranchEffectsSink implements Sink<IBranch | INode> {
  disposables: Disposable[] = []
  sinks: Disposable[] = []

  constructor(private env: RunEnvironment,
              private parentElement: IBranchElement,
              private segmentPosition: number,
              private segmentsCount: number[]) { }

  event(_: Time, node: INode | IBranch) {


    try {
      node?.disposable.setDisposable(
        disposeWith(node => {
          node.element.remove()
          this.sinks[this.segmentPosition]?.dispose()
          this.segmentsCount[this.segmentPosition]--
        }, node)
      )
    } catch (e) {
      console.error(node.element)

      throw new Error(`Cannot append node that have already been rendered, check invalid node operations under `)
    }

    const sinkPos = this.segmentsCount[this.segmentPosition]++


    let slot = 0

    for (let s = 0; s < this.segmentPosition; s++) {
      slot += this.segmentsCount[s]
    }

    appendToSlot(this.parentElement, node.element, slot)

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


    this.sinks[sinkPos] = '$segments' in node
      ? new BranchChildrenSinkList(node.$segments, this.env, node)
      : disposeNone()
    
  }

  end(t: Time) {
    this.segmentsCount[this.segmentPosition]--
    this.sinks.forEach(s => s.dispose())
  }

  error(t: Time, err: Error) {
    console.error(err)
  }

}

class BranchChildrenSinkList implements Disposable {
  disposables: Disposable[]
  sinks: BranchEffectsSink[]

  constructor($segments: $Node<INodeElement>[], private env: RunEnvironment, private node: IBranch) {

    const l = $segments.length
    const segmentsCount = new Array(l).fill(0)

    this.disposables = new Array(l)
    this.sinks = new Array(l)

    for (let i = 0; i < l; ++i) {
      const $child = $segments[i]
      const sink = new BranchEffectsSink(this.env, node.element, i, segmentsCount)

      this.sinks[i] = sink
      this.disposables[i] = $child.run(sink, this.env.scheduler)
    }

  }

  dispose(): void {
    // this.sinks.forEach(s => s.end())
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
      if (value) {
        node.setAttribute(attrKey, String(value))
      } else {
        node.removeAttribute(attrKey)
      }
    })
  }

  return node
}
