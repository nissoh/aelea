import { style } from "@aelea/core";
import { $main } from "../common/common";
import $Website from "../pages/$Website";

export default $main(style({ alignItems: 'center', margin: '0 auto', }))(
  $Website({}) // bump
)