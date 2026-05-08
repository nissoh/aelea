export function colorWeight(color: string, weight: number): string {
  if (weight < 0 || weight > 100) {
    throw new RangeError(`colorWeight: weight must be in [0, 100], got ${weight}`)
  }
  return `color-mix(in srgb, ${color} ${weight}%, var(--shade-pole))`
}

export const colorShade = colorWeight
