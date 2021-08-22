import { $Node } from '@aelea/dom'
import { Contract } from "@ethersproject/contracts"
import { SYMBOL } from "./api/address/symbol"
import { IContract } from "./api/contract"


export interface Token<T extends Contract = Contract> {
  label: string
  symbol: SYMBOL
  contract: IContract<T>
}