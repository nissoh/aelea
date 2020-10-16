
import { awaitPromises, chain, combine, constant, fromPromise, map, now, tap } from '@most/core'
import { $custom, $element, $node, $Node, attr, Behavior, component, ContainerDomNode, create, NodeChild, O, Op, style } from 'fufu'
import { $card, $column, $row } from '../common/common'



import sdk from "@stackblitz/sdk";
import { EmbedOptions, Project } from '@stackblitz/sdk/typings/interfaces';
import { flex, spacingBig } from '../common/stylesheet';


// const $sbEmbed = create(
//     map((code: string) => {



//         // x.element.style.border = 'none'

//         return el
//     })
// )


export default (...$content: $Node<HTMLElement, {}>[]) => component((
    []: Behavior<PointerEvent, PointerEvent>,
) => {


    const code = `
import {} from 'fufu';

function formatName(user) {
  return user.firstName + ' ' + user.lastName;
}

const user = {
  firstName: 'Harper',
  lastName: 'Meck',
};

const element = (
  <h1>
    Hello, {formatName(user)}!
  </h1>
);

`;

    return [

        $row(spacingBig, flex, style({ placeContent: 'center', minHeight: '100vh', padding: '30px', scrollSnapAlign: 'start' }))(
            $card(
                ...$content
            ),

            $row(
                style({ alignSelf: 'stretch', overflow: 'hidden' }),
                map(node => {

                    const embedOptions = <EmbedOptions>{
                        // openFile: 'index.ts', // Show a specific file on embed load
                        hideExplorer: true,
                        openFile: 'index.ts',
                        view: 'editor',
                        hideNavigation: true,
                        forceEmbedLayout: true, // Disables the full stackblitz UI on larger screen sizes
                        // origin?: string; // Set the origin URL of your StackBlitz EE server
                    }

                    // Create the project payload.
                    const project = <Project>{
                        files: {
                            // 'index.html': `<h2>Hello there!</h2>`,
                            "index.ts": code
                        },
                        title: "Dynamically Generated Project",
                        description: "Created with <3 by the StackBlitz SDK!",
                        template: "typescript",
                        tags: ["stackblitz", "sdk"]
                    };

                    // await Promise.resolve()




                    const www = create(
                        map(x => {
                            const dummy = document.createElement('dummy')
                            node.element.appendChild(dummy)
                            const vm = fromPromise(
                                sdk.embedProjectId(dummy, 'typescript-hbfabr', embedOptions)
                            )
                            // https://github.com/nissoh/fufu/tree/v1
                            const frame = node.element.querySelector('iframe')!

                            frame.style.border = 'none'
                            frame.style.borderRadius = '4px'
                            frame.style.height = 'calc(100% + 40px)'
                            frame.style.width = '400px'


                            return dummy
                        })
                    )(null)()

                    return { ...node, childrenSegment: [www] }


                })
            )(

            )
        )

    ]
})

