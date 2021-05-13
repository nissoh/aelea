import { $Node } from "@aelea/core"
import { Contract } from "ethers"
import { SYMBOL } from "./api/address/symbol"
import { IContract } from "./api/contract"


export interface Token<T extends Contract = Contract> {
  $icon: $Node
  label: string
  symbol: SYMBOL
  contract: IContract<T>
}