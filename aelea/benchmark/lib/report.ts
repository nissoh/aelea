import type { Bench, Statistics, Task } from 'tinybench'
import { type IBenchTask, type ISuite, parseTaskName, taskName } from './suite.js'

const useColor = !process.env.NO_COLOR && (process.stdout as { isTTY?: boolean }).isTTY === true

const ansi = (code: string) => (s: string) => (useColor ? `\x1b[${code}m${s}\x1b[0m` : s)
const dim = ansi('2')
const bold = ansi('1')
const cyan = ansi('36')
const green = ansi('32')
const red = ansi('31')
const yellow = ansi('33')
const gray = ansi('90')

interface IRow {
  variant: string
  baseline: boolean
  median: number // ms
  mean: number // ms
  ops: number
  rsd: number // %
  samples: number
  delta: number | null // ratio: ops / baseline.ops; null if no baseline
}

interface IGroup {
  name: string
  rows: IRow[]
  unit: 'ns' | 'µs' | 'ms'
  unitFactor: number // multiply ms by this to get unit value
}

const TERM_WIDTH = 78

function pickUnit(maxMs: number): { unit: IGroup['unit']; factor: number } {
  if (maxMs >= 1) return { unit: 'ms', factor: 1 }
  if (maxMs >= 0.001) return { unit: 'µs', factor: 1_000 }
  return { unit: 'ns', factor: 1_000_000 }
}

function fmtTime(ms: number, unit: IGroup['unit'], factor: number): string {
  const v = ms * factor
  if (v >= 1000) return v.toFixed(0)
  if (v >= 100) return v.toFixed(1)
  if (v >= 10) return v.toFixed(2)
  return v.toFixed(3)
}

function fmtOps(ops: number): string {
  if (ops >= 1_000_000) return `${(ops / 1_000_000).toFixed(2)}M`
  if (ops >= 1_000) return `${(ops / 1_000).toFixed(1)}k`
  return ops.toFixed(0)
}

function fmtCount(n: number): string {
  return n.toLocaleString('en-US')
}

function statsOf(task: Task): { latency: Statistics; throughput: Statistics; runs: number } | null {
  const r = task.result
  if (!r || r.state !== 'completed') return null
  return { latency: r.latency, throughput: r.throughput, runs: task.runs }
}

function buildGroups(suite: ISuite, bench: Bench): { groups: IGroup[]; failures: { name: string; reason: string }[] } {
  const byName = new Map<string, Task>()
  for (const t of bench.tasks) byName.set(t.name, t)

  const groupOrder: string[] = []
  const groupMap = new Map<string, IBenchTask[]>()
  for (const t of suite.tasks) {
    if (!groupMap.has(t.group)) {
      groupMap.set(t.group, [])
      groupOrder.push(t.group)
    }
    groupMap.get(t.group)!.push(t)
  }

  const groups: IGroup[] = []
  const failures: { name: string; reason: string }[] = []

  for (const groupName of groupOrder) {
    const taskCfgs = groupMap.get(groupName)!
    const rows: IRow[] = []
    const baselineCfg = taskCfgs.find(t => t.baseline) ?? taskCfgs[0]
    const baselineTask = baselineCfg ? byName.get(taskName(baselineCfg)) : undefined
    const baselineStats = baselineTask ? statsOf(baselineTask) : null
    const baselineOps = baselineStats?.throughput.mean ?? null

    let maxMedian = 0

    for (const cfg of taskCfgs) {
      const task = byName.get(taskName(cfg))
      if (!task) {
        failures.push({ name: taskName(cfg), reason: 'task not registered' })
        continue
      }
      const s = statsOf(task)
      if (!s) {
        const r = task.result
        const reason = r?.state ?? 'no result'
        failures.push({ name: task.name, reason })
        continue
      }
      const median = s.latency.p50 ?? s.latency.mean
      maxMedian = Math.max(maxMedian, median)
      rows.push({
        variant: cfg.variant,
        baseline: cfg === baselineCfg,
        median,
        mean: s.latency.mean,
        ops: s.throughput.mean,
        rsd: s.latency.rme ?? 0,
        samples: s.runs,
        delta: baselineOps !== null && baselineOps > 0 ? s.throughput.mean / baselineOps : null
      })
    }

    if (rows.length === 0) continue
    const { unit, factor } = pickUnit(maxMedian)
    groups.push({ name: groupName, rows, unit, unitFactor: factor })
  }

  return { groups, failures }
}

function deltaCell(row: IRow): string {
  if (row.baseline) return yellow('◆ baseline')
  if (row.delta === null) return dim('—')
  const pct = row.delta
  const fmt = `${pct.toFixed(2)}×`
  if (pct > 1.05) return green(`▲ ${fmt} faster`)
  if (pct < 0.95) return red(`▼ ${fmt} slower`)
  return gray(`◇ ${fmt} parity`)
}

function pad(s: string, width: number, align: 'left' | 'right' = 'left'): string {
  // strip ANSI for length calc
  const visible = s.replace(/\x1b\[[0-9;]*m/g, '')
  const need = Math.max(0, width - visible.length)
  return align === 'left' ? s + ' '.repeat(need) : ' '.repeat(need) + s
}

function rule(char = '─', len = TERM_WIDTH): string {
  return dim(char.repeat(len))
}

function header(title: string, subtitle?: string): string {
  const leftVisible = `── ${title} `
  const rightVisible = subtitle ? ` ${subtitle} ──` : '──'
  const fill = Math.max(3, TERM_WIDTH - leftVisible.length - rightVisible.length)
  const leftStyled = `${dim('──')} ${bold(cyan(title))} `
  const rightStyled = subtitle ? ` ${dim(subtitle)} ${dim('──')}` : dim('──')
  return `${leftStyled}${dim('─'.repeat(fill))}${rightStyled}`
}

const COLS = {
  variant: 18,
  median: 10,
  ops: 10,
  rsd: 8,
  samples: 9,
  delta: 22
} as const

function colHeader(unit: string): string {
  const cells = [
    pad('variant', COLS.variant),
    pad(`median ${unit}`, COLS.median, 'right'),
    pad('ops/s', COLS.ops, 'right'),
    pad('rsd', COLS.rsd, 'right'),
    pad('samples', COLS.samples, 'right'),
    pad('  delta', COLS.delta)
  ]
  return dim(cells.join('  '))
}

function rowLine(row: IRow, unit: IGroup['unit'], factor: number): string {
  const cells = [
    pad(row.baseline ? row.variant : bold(row.variant), COLS.variant),
    pad(fmtTime(row.median, unit, factor), COLS.median, 'right'),
    pad(fmtOps(row.ops), COLS.ops, 'right'),
    pad(`${row.rsd.toFixed(2)}%`, COLS.rsd, 'right'),
    pad(fmtCount(row.samples), COLS.samples, 'right'),
    `  ${deltaCell(row)}`
  ]
  return cells.join('  ')
}

export interface ISuiteSummary {
  title: string
  bestDelta: number | null // best ratio achieved by non-baseline rows (>1 = faster than baseline)
  worstDelta: number | null
  groupCount: number
  taskCount: number
  failures: number
}

export function printReport(suite: ISuite, bench: Bench): ISuiteSummary {
  const { groups, failures } = buildGroups(suite, bench)

  const out: string[] = []
  out.push('')
  out.push(header(suite.title, suite.subtitle))

  const showGroupHeaders = groups.length > 1 || (groups[0]?.name ?? '') !== ''
  // Pick a single suite-wide unit so the column header can be hoisted to the
  // top — keeps the table readable across multiple groups.
  const maxMedianMs = Math.max(...groups.flatMap(g => g.rows.map(r => r.median)), 0)
  const { unit: suiteUnit, factor: suiteFactor } = pickUnit(maxMedianMs)

  out.push('')
  out.push(`  ${colHeader(suiteUnit)}`)
  out.push(`  ${rule('─', TERM_WIDTH - 2)}`)

  for (const g of groups) {
    if (showGroupHeaders) {
      out.push(`  ${cyan('▸')} ${bold(g.name || '(default)')}`)
    }
    for (const row of g.rows) out.push(`  ${rowLine(row, suiteUnit, suiteFactor)}`)
    if (showGroupHeaders) out.push('')
  }

  if (failures.length > 0) {
    out.push('')
    out.push(`  ${red('failures:')}`)
    for (const f of failures) out.push(`  ${red('•')} ${f.name} ${dim(`(${f.reason})`)}`)
  }

  out.push('')
  console.log(out.join('\n'))

  const nonBaselineDeltas = groups.flatMap(g => g.rows.filter(r => !r.baseline && r.delta !== null).map(r => r.delta!))
  return {
    title: suite.title,
    bestDelta: nonBaselineDeltas.length ? Math.max(...nonBaselineDeltas) : null,
    worstDelta: nonBaselineDeltas.length ? Math.min(...nonBaselineDeltas) : null,
    groupCount: groups.length,
    taskCount: groups.reduce((sum, g) => sum + g.rows.length, 0),
    failures: failures.length
  }
}

export function printGrandSummary(summaries: ISuiteSummary[], elapsedMs: number): void {
  const out: string[] = []
  out.push('')
  out.push(header('summary', `${(elapsedMs / 1000).toFixed(1)}s elapsed`))
  out.push('')

  const labelW = Math.max(20, ...summaries.map(s => s.title.length))
  for (const s of summaries) {
    const best = s.bestDelta
    const worst = s.worstDelta
    const totals = `${s.taskCount} tasks` + (s.groupCount > 1 ? ` · ${s.groupCount} groups` : '')
    let delta = dim('no comparison')
    if (best !== null && worst !== null) {
      if (best > 1.05 && worst >= 0.95) delta = green(`▲ ${best.toFixed(2)}× best`)
      else if (worst < 0.95 && best <= 1.05) delta = red(`▼ ${worst.toFixed(2)}× worst`)
      else if (best > 1.05 && worst < 0.95) delta = `${green(`▲${best.toFixed(2)}×`)} ${red(`▼${worst.toFixed(2)}×`)}`
      else delta = gray('◇ parity')
    }
    const failTag = s.failures > 0 ? ` ${red(`(${s.failures} failed)`)}` : ''
    out.push(`  ${pad(s.title, labelW)}  ${dim(pad(totals, 24))}  ${delta}${failTag}`)
  }

  out.push('')
  console.log(out.join('\n'))
}
