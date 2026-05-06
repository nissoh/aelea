// Run all benchmark suites with unified reporting. Usage:
//   bun run benchmark/run.ts                 # all suites
//   bun run benchmark/run.ts combinators     # filter to suites whose names match
//   bun run benchmark/run.ts -- --quick      # halve the time budget per suite

import { type ISuiteSummary, printGrandSummary, printReport } from './lib/report.js'
import { runSuite } from './lib/suite.js'
import combinators from './suites/combinators.js'
import mapFilterReduce from './suites/map-filter-reduce.js'
import renderStatic from './suites/render-static.js'
import scan from './suites/scan.js'
import scheduler from './suites/scheduler.js'
import switchSuite from './suites/switch.js'
import switchLatest from './suites/switch-latest.js'

const ALL = [mapFilterReduce, scan, switchSuite, switchLatest, combinators, scheduler, renderStatic]

const args = process.argv.slice(2)
const quick = args.includes('--quick')
const filters = args.filter(a => !a.startsWith('--'))

const selected =
  filters.length === 0 ? ALL : ALL.filter(s => filters.some(f => s.title.toLowerCase().includes(f.toLowerCase())))

if (selected.length === 0) {
  console.error(`no suites matched: ${filters.join(', ')}`)
  console.error(`available: ${ALL.map(s => s.title).join(', ')}`)
  process.exit(1)
}

console.log(`\n  running ${selected.length} suite${selected.length === 1 ? '' : 's'}${quick ? ' (quick mode)' : ''}…`)

const start = performance.now()
const summaries: ISuiteSummary[] = []

for (const suite of selected) {
  const opts = quick
    ? { ...suite.options, time: Math.max(100, (suite.options?.time ?? 500) / 2), warmupTime: 100 }
    : suite.options
  const bench = await runSuite({ ...suite, options: opts })
  summaries.push(printReport(suite, bench))
}

if (summaries.length > 1) printGrandSummary(summaries, performance.now() - start)
