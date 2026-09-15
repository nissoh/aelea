// Every package must import in a process with no window, document or
// navigator: a module that touches the DOM at load breaks SSR, the takumi
// renderer, and any test file that imports before installing a DOM.

import { describe, expect, test } from 'bun:test'
import { resolve } from 'node:path'

const ENTRIES = ['stream', 'stream-extended', 'ui', 'ui-components', 'ui-components-theme', 'ui-router']

describe('packages import without a DOM', () => {
  for (const entry of ENTRIES) {
    test(`aelea/${entry} imports with no window or document`, () => {
      const file = resolve(import.meta.dir, `../src/${entry}/index.ts`)
      const run = Bun.spawnSync(['bun', '-e', `await import(${JSON.stringify(file)})`], {
        stdout: 'pipe',
        stderr: 'pipe'
      })
      const tail = run.stderr.toString().trim().split('\n').slice(-3).join('\n')
      expect({ entry, code: run.exitCode, error: run.exitCode === 0 ? '' : tail }).toEqual({
        entry,
        code: 0,
        error: ''
      })
    })
  }
})
