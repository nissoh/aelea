import { empty, map, merge, multicast, never, now, sample, skipRepeats, switchLatest } from "@most/core";
import { O } from "../../../core/common.js";
import type { Behavior } from "../../../core/types.js";
import { $text, component, style } from "../../../dom/index.js";
import { pallete } from "../../../ui-components-theme/globalState.js";
import { $row } from "../../elements/$elements.js";
import { layoutSheet } from "../../index.js";
import { $Field } from "./$Field.js";
import type { TextField } from "./$TextField.js";
import { $label } from "./form.js";


export const $TextField = (config: TextField) => component((
  [change, valueTether]: Behavior<string, string>,
  [blur, blurTether]: Behavior<FocusEvent, FocusEvent>
) => {
  const { hint } = config;
  const multicastValidation = config.validation ? O(config.validation, src => sample(src, blur), multicast) : undefined;
  const fieldOp = config.containerOp ?? O();
  const validation = multicastValidation ? skipRepeats(multicastValidation(change)) : never();

  const $messageLabel = $text(style({ fontSize: '75%', width: '100%' }));
  const $hint = hint ? now($messageLabel(hint)) : never();

  const $alert = map(msg => {
    if (msg) {
      const negativeStyle = style({ color: pallete.negative });
      return negativeStyle($messageLabel(msg) as any);
    }
    return hint ? $messageLabel(hint) : empty();
  }, validation);

  const $message = switchLatest(merge($hint, $alert));

  return [
    $row(fieldOp, style({ alignItems: 'flex-start' }))(
      $label(layoutSheet.flex, layoutSheet.spacingTiny)(
        $row(layoutSheet.flex, layoutSheet.spacingSmall)(
          $text(style({ alignSelf: 'flex-end', cursor: 'pointer', paddingBottom: '1px', ...config.labelStyle }))(config.label),
          $Field({ ...config, validation: multicastValidation })({
            change: valueTether(),
            blur: blurTether()
          })
        ),
        $message
      )
    ),

    { change, }
  ];
});
