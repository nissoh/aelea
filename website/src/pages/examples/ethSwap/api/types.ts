import { Contract } from "@ethersproject/contracts"
import { Token } from "../types"

export type Address = string

export interface ITransaction<T extends Contract = Contract> {
  token: Token<T>,
  from: Address
  to: Address
  value: bigint
}