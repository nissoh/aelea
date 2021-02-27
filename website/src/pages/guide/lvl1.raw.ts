import { $text, runBrowser } from '@aelea/core'
import { constant, map, periodic, scan } from '@most/core'

const eventEverySecond = periodic(1000)
const mapTo1 = constant(1, eventEverySecond)

const accumulate = scan((n1: number, n2: number) => n1 + n2, 0, mapTo1)
const toString = map(String, accumulate)


runBrowser({ rootNode: document.body })(
  $text(toString)
)