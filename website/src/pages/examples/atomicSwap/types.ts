import { $Node } from "@aelea/core"

export type Address = string

export interface Token {
  address: Address
  $icon: $Node
  label: string
  symbol: string
  balance: number
}