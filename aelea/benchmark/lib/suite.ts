import { Bench } from 'tinybench'
import { printReport } from './report.js'

export interface IBenchTask {
  group: string
  variant: string
  baseline?: boolean
  fn: () => unknown | Promise<unknown>
}

export interface ISuiteOptions {
  time?: number
  warmupTime?: number
  iterations?: number
  warmupIterations?: number
}

export interface ISuite {
  title: string
  subtitle?: string
  options?: ISuiteOptions
  tasks: IBenchTask[]
}

const TASK_NAME_SEP = ' :: '

export function taskName(t: IBenchTask): string {
  return t.group ? `${t.group}${TASK_NAME_SEP}${t.variant}` : t.variant
}

export function parseTaskName(name: string): { group: string; variant: string } {
  const i = name.indexOf(TASK_NAME_SEP)
  if (i < 0) return { group: '', variant: name }
  return { group: name.slice(0, i), variant: name.slice(i + TASK_NAME_SEP.length) }
}

export async function runSuite(suite: ISuite): Promise<Bench> {
  const bench = new Bench({
    name: suite.title,
    time: 500,
    warmupTime: 250,
    throws: true,
    ...suite.options
  })
  for (const t of suite.tasks) bench.add(taskName(t), t.fn)
  bench.addEventListener('error', e => {
    // surface task errors instead of swallowing
    console.error(e)
  })
  await bench.run()
  return bench
}

export async function runAndPrint(suite: ISuite): Promise<Bench> {
  const bench = await runSuite(suite)
  printReport(suite, bench)
  return bench
}
