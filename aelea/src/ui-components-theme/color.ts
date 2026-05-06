export function colorShade(color: string, intensity: number): string {
  if (intensity < 0 || intensity > 100) {
    throw new RangeError(`colorShade: intensity must be in [0, 100], got ${intensity}`)
  }
  return `color-mix(in srgb, ${color} ${intensity}%, var(--shade-pole))`
}
