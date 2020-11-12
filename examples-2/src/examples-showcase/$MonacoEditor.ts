import { awaitPromises, map } from '@most/core'
import { $element, Behavior, component, NodeContainer, style } from '@aelea/core'
import monaco, { editor } from 'monaco-editor'
import { column } from '../common/stylesheet'

async function loadMonaco(
    container: HTMLElement,
    config?: editor.IStandaloneEditorConstructionOptions,
    override?: editor.IEditorOverrideServices
): Promise<editor.IStandaloneCodeEditor> {
    const req: any = require
    req.config({
        paths: { vs: 'https://typescript.azureedge.net/cdn/4.0.3/monaco/min/vs' },
        'vs/css': { disabled: true }
    })

    const file = fetch("https://raw.githubusercontent.com/brijeshb42/monaco-themes/master/themes/Pastels%20on%20Dark.json")

    const shadowRoot = container.attachShadow({
        mode: 'closed'
    })

    const innerContainer = document.createElement('div')
    shadowRoot.appendChild(innerContainer)

    const innerStyle = document.createElement('style')

    innerContainer.style.flex = '1'

    innerStyle.innerText =
        '@import "https://typescript.azureedge.net/cdn/4.0.3/monaco/min/vs/editor/editor.main.css"'
    shadowRoot.appendChild(innerStyle)


    return new Promise(resolve => {
        req(['vs/editor/editor.main'], async function (m: typeof monaco) {
            const theme: editor.IStandaloneThemeData = {
                ...await (await file).json(),
                // base: "vs-dark",
                // inherit: true
            }

            m.editor.defineTheme('pastel', theme)

            const ops: editor.IStandaloneEditorConstructionOptions = {
                theme: 'pastel',
                "semanticHighlighting.enabled": true,
                minimap: {
                    enabled: false
                },
                // readOnly: true,
                scrollBeyondLastLine: false,
                ...config,
            }
            const instance = m.editor.create(innerContainer, ops, override)

            instance.layout()

            resolve(instance)
        })
    })
}

export default component((
    [sampleInstance, instance]: Behavior<NodeContainer, editor.IStandaloneCodeEditor>
) => {


    const loadInstanceBehavior = sampleInstance(
        map(node => {
            return loadMonaco(node.element as HTMLElement, {
                value: ['function x() {', '\tconsole.log("Hello world!");', '}'].join('\n'),
                language: 'typescript'
            })
        }),
        awaitPromises
    )
    return [
        $element('div')(
            style({ width: '600px' }),
            column,
            loadInstanceBehavior
        )(),

        { instance }
    ]
})