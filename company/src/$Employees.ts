import {
  at,
  combine,
  constant,
  filter,
  join,
  just,
  map,
  merge,
  op,
  periodic,
  reduce,
  skipRepeats,
  take,
  until
} from 'aelea/stream'
import { animationFrame, state } from 'aelea/stream-extended'
import { $node, fromEventTarget, motion, style, styleBehavior } from 'aelea/ui'

const CORE = '#c79a16' // gold nucleus pixel
const ink = (a: number) => `rgba(52,48,31,${a})`

const TAU = Math.PI * 2
const P = 3 // pixel size — small, so the form stays subtle
const EGG_AX = 0.74 // egg width relative to its height (taller than wide)
const EGG_TAPER = 0.34 // narrows the top lobe to a point → egg, not ellipse
const SPAWN_MS = 10000 // a fresh Fibonacci batch every 10s
const MAX_BATCHES = 9 // 1+1+2+3+5+8+13+21+34 = 88 sperm, then spawning stops
const CLOCK_MS = 33 // ~30fps orbit/wander clock

// One shared pixel sprite for every sperm. [dx, dy] are grid offsets from the head
// centre (the base pixel at 0,0, which is the gold core); +x points forward.
const SPRITE = (
  [
    [1, 0, ink(0.85)],
    [2, 0, ink(0.85)], // nose
    [-1, 0, ink(0.85)], // neck
    [0, -1, ink(0.8)],
    [1, -1, ink(0.8)],
    [0, 1, ink(0.8)],
    [1, 1, ink(0.8)],
    [-2, 0, ink(0.55)],
    [-3, 0, ink(0.4)],
    [-4, 0, ink(0.28)],
    [-5, 0, ink(0.18)],
    [-6, 0, ink(0.1)] // fading tail
  ] as [number, number, string][]
)
  .map(([dx, dy, c]) => `${dx * P}px ${dy * P}px 0 0 ${c}`)
  .join(', ')

interface Spec {
  start: { x: number; y: number }
  radius: number
  phase: number
  omega: number
  cfg: { stiffness: number; damping: number }
  scale: number
  opacity: number
  wander: (k: number) => { x: number; y: number }
}

const rand = (lo: number, hi: number) => lo + Math.random() * (hi - lo)
const sgn = () => (Math.random() < 0.5 ? 1 : -1)

// Sperm drift in from just beyond a random screen edge, at a random point along it.
const randomEdge = () => {
  const w = window.innerWidth
  const h = window.innerHeight
  const m = 80
  switch (Math.floor(Math.random() * 4)) {
    case 0:
      return { x: rand(0, w), y: -m }
    case 1:
      return { x: w + m, y: rand(0, h) }
    case 2:
      return { x: rand(0, w), y: h + m }
    default:
      return { x: -m, y: rand(0, h) }
  }
}

// A directionless meander: two slow, out-of-phase sines per axis never resolve into
// a clean loop, so the sperm wanders the screen with no obvious heading.
const makeWander = (): ((k: number) => { x: number; y: number }) => {
  const w = window.innerWidth
  const h = window.innerHeight
  const f = () => rand(0.004, 0.013) * sgn()
  const bx = rand(0.25, 0.75) * w
  const by = rand(0.25, 0.75) * h
  const ax1 = rand(0.12, 0.28) * w
  const ax2 = rand(0.05, 0.15) * w
  const ay1 = rand(0.12, 0.28) * h
  const ay2 = rand(0.05, 0.15) * h
  const fx1 = f()
  const fx2 = f()
  const fy1 = f()
  const fy2 = f()
  const px1 = rand(0, TAU)
  const px2 = rand(0, TAU)
  const py1 = rand(0, TAU)
  const py2 = rand(0, TAU)
  return (k: number) => ({
    x: bx + ax1 * Math.sin(fx1 * k + px1) + ax2 * Math.sin(fx2 * k + px2),
    y: by + ay1 * Math.sin(fy1 * k + py1) + ay2 * Math.sin(fy2 * k + py2)
  })
}

const makeSpec = (): Spec => ({
  start: randomEdge(),
  radius: rand(34, 92),
  phase: rand(0, TAU),
  omega: rand(0.018, 0.04) * sgn(),
  // low stiffness → slow, deliberate approach across the screen
  cfg: { stiffness: rand(12, 24), damping: rand(7, 12) },
  scale: rand(0.7, 1.4),
  opacity: rand(0.3, 0.6),
  wander: makeWander()
})

// Unified pointer (mouse hover, touch, pen). On mobile there is no hover, so this
// stays silent until the first tap/drag — exactly when we want them to home in.
const point = (e: PointerEvent) => ({ x: e.clientX, y: e.clientY })
const interactions = merge(
  op(fromEventTarget(window, 'pointerdown'), map(point)),
  op(fromEventTarget(window, 'pointermove'), map(point))
)

// pointer is seeded centre only so combine() has a value; it is read solely once
// hasInteracted flips true (first hover/touch), after which the swarm follows it.
const pointer = op(merge(just({ x: window.innerWidth / 2, y: window.innerHeight / 2 }), interactions), state())
const hasInteracted = op(merge(just(false), constant(true, interactions)), skipRepeats, state())

// Shared monotonic frame counter that advances every orbit angle and wander phase.
const clock = op(
  periodic(CLOCK_MS),
  reduce((n: number) => n + 1, 0),
  state()
)

const $sperm = (spec: Spec) => {
  // Before interaction → wander aimlessly. After → an egg-shaped orbit of the
  // pointer; the slow spring drifts in from the edge and, since the orbit point
  // keeps moving, never settles, so it encircles the pointer in an egg outline.
  const target = op(
    combine({ p: pointer, k: clock, on: hasInteracted }),
    map(({ p, k, on }) => {
      if (!on) return spec.wander(k)
      const a = spec.phase + spec.omega * k
      const w = spec.radius * EGG_AX * (1 + EGG_TAPER * Math.sin(a))
      return { x: p.x + w * Math.cos(a), y: p.y + spec.radius * Math.sin(a) }
    }),
    state()
  )

  // Lead with the edge point so motion initialises there, then hand over to target.
  const targetX = op(
    merge(
      just(spec.start.x),
      op(
        target,
        map(t => t.x)
      )
    ),
    state()
  )
  const targetY = op(
    merge(
      just(spec.start.y),
      op(
        target,
        map(t => t.y)
      )
    ),
    state()
  )

  const frame = combine({
    x: motion(spec.cfg, targetX),
    y: motion(spec.cfg, targetY),
    tx: targetX,
    ty: targetY
  })

  return $node(
    style({
      position: 'absolute',
      top: '0',
      left: '0',
      width: `${P}px`,
      height: `${P}px`,
      backgroundColor: CORE,
      boxShadow: SPRITE,
      transformOrigin: '50% 50%',
      willChange: 'transform',
      opacity: spec.opacity,
      pointerEvents: 'none'
    }),
    styleBehavior(
      map(({ x, y, tx, ty }) => {
        const angle = Math.atan2(ty - y, tx - x)
        return { transform: `translate3d(${x - P / 2}px, ${y - P / 2}px, 0) rotate(${angle}rad) scale(${spec.scale})` }
      }, frame)
    )
  )()
}

// Fibonacci batch sizes, one per period at 0s, 10s, 20s, …: 1,1,2,3,5,8,13,21,34.
const fibCount = op(
  take(MAX_BATCHES, merge(at(0), periodic(SPAWN_MS))),
  reduce((acc: { prev: number; cur: number }) => ({ prev: acc.cur, cur: acc.prev + acc.cur }), { prev: 1, cur: 0 }),
  map(acc => acc.cur),
  filter(n => n > 0)
)

// Trickle each batch's n spawns evenly across its 10s window (one every 10s/n,
// the first immediately), so the swarm thickens at an ever-quickening rate.
const specStream = join(
  map(
    (n: number) =>
      op(
        merge(just(0), periodic(SPAWN_MS / n)),
        take(n),
        map(() => makeSpec())
      ),
    fibCount
  )
)

// Circuit-breaker: watch real frame cadence and latch "degraded" after sustained
// low FPS, then stop spawning. Existing sperm keep swimming; the swarm just won't
// grow further. fps < 8 (backgrounded tab / giant stall) is ignored, not counted.
const FPS_FLOOR = 40
const SUSTAIN = 45 // ~0.75s of sustained sub-floor frames before latching
const perfDegraded = op(
  animationFrame(),
  reduce(
    (acc: { prev: number; slow: number }, t: number) => {
      const fps = t > acc.prev ? 1000 / (t - acc.prev) : 60
      return { prev: t, slow: fps < FPS_FLOOR && fps > 8 ? acc.slow + 1 : 0 }
    },
    { prev: 0, slow: 0 }
  ),
  filter(s => s.slow >= SUSTAIN),
  take(1)
)

// join merges every spawn's node stream into the single slot the renderer appends to.
const $swarm = join(map((spec: Spec) => $sperm(spec), until(perfDegraded, specStream)))

export const $employees = $node(
  style({
    position: 'fixed',
    inset: '0',
    overflow: 'hidden',
    pointerEvents: 'none',
    zIndex: 0
  })
)($swarm)
