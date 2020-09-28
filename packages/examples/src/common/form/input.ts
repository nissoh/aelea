import { map, combine } from "@most/core";
import { $element, attr, Behavior, component, DomNode, stylePseudo, event } from "fufu";

import { Input, InputType } from "../form";
import * as designSheet from '../style/stylesheet'

export const $Input = (props: Input) => component((
    [sampleValue, value]: Behavior<DomNode, string>
) => {

    return [
        $element('input')(
            attr({ type: props.type ?? InputType.TEXT, name: props.name }),
            designSheet.input,

            stylePseudo(':hover', { borderColor: designSheet.theme.primary }),
            stylePseudo(':focus', { borderColor: designSheet.theme.primary }),

            sampleValue(
                event('input'),
                map(inputEv => {
                    if (inputEv.target instanceof HTMLInputElement) {
                        const text = inputEv.target.value
                        return text || '';
                    }
                    return ''
                })
            ),

            // applying by setting `HTMLInputElement.value` imperatively(only way known to me)
            (source) => props.setValue
                ? combine((inputEl, val) => {
                    inputEl.element.value = val
                    return inputEl
                }, source, props.setValue)
                : source
        )(),

        {
            value
        }
    ]
})