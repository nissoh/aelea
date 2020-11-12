
import { map } from '@most/core';
import { $element, $Node, attr, Behavior, component, style } from '@aelea/core';
import { $card, $column, $row } from '../common/common';
import { flex, spacingBig } from '../common/stylesheet';


interface Example {
    file: string,
}

export default (config: Example) => (...$content: $Node[]) => component((
    []: Behavior<PointerEvent, PointerEvent>,
) => {


    return [

        $column(spacingBig, style({ placeContent: 'center flex-start', width: '500px', margin: '10vh 0' }))(
            ...$content
            // $row(
            //     style({ alignSelf: 'stretch', backgroundColor: '#1e1e1e', width: '70vw', maxWidth: '1450px', position: 'relative', overflow: 'hidden' }),
            //     map(node => {

            //         const params = new URLSearchParams({
            //             autoresize: '0',
            //             // previewwindow: '',
            //             fontsize: '11',
            //             // hidedevtools: '1',
            //             // hidenavigation: '1',
            //             // runonclick: '1',
            //             editorsize: '70',
            //             view: 'editor',
            //             module: `/${config.file}`,
            //         }).toString();

            //         const $codeSandboxFrame = $element('iframe')(
            //             attr({
            //                 src: `https://codesandbox.io/s/polished-mountain-b0yp4?${params}`,
            //                 allow: 'accelerometer; ambient-light-sensor; camera; encrypted-media; geolocation; gyroscope; hid; microphone; midi; payment; usb; vr; xr-spatial-tracking',
            //                 sandbox: 'allow-forms allow-modals allow-popups allow-presentation allow-same-origin allow-scripts',
            //             }),

            //             // yeeeeaaar!?
            //             // https://www.youtube.com/watch?v=DwA2qECnQCA
            //             // perhaps until this issue is resolved (: https://github.com/codesandbox/codesandbox-client/issues/2106
            //             style({
            //                 border: 'none',
            //                 borderRadius: '4px',
            //                 position: 'absolute',
            //                 width: '1450px',
            //                 top: '-49px',
            //                 left: '-330px',
            //                 bottom: '0',
            //                 right: '0',
            //                 height: 'calc(100% + 71px)',
            //             }),
            //         )()


            //         return { ...node, childrenSegment: [$codeSandboxFrame] }
            //     })
            // )()
        )


    ]
})

