/**
 * Lerp a color between the theme's background-blending pole and the input,
 * emitted as a CSS `color-mix()` expression.
 *
 *   intensity = 0   → fully `var(--shade-pole)` (white on light themes,
 *                     black on dark themes)
 *   intensity = 100 → input color, unchanged
 *   intensity = 25  → 25% of the input's prominence above the pole
 *
 * Theme reactivity is delegated to CSS: `--shade-pole` is defined per-theme,
 * so the same returned string yields different visuals when the body class
 * swaps. Works with hex, rgb, named-color, and `var(--…)` inputs.
 *
 * Examples (computed by the browser):
 *   colorShade('var(--message)', 25)  on dark  → ~rgb(64,64,64)   (75% less white)
 *   colorShade('var(--message)', 25)  on light → ~rgb(191,191,191) (75% less black)
 *   colorShade('#FF0000', 25)         on dark  → ~rgb(64,0,0)     (dark red)
 *   colorShade('#FF0000', 25)         on light → ~rgb(255,191,191) (soft pink)
 *
 * Requires a `--shade-pole` CSS variable defined per theme (white on light,
 * black on dark) and `color-mix()` browser support (Chrome 111+, Firefox 113+,
 * Safari 16.2+).
 */
export function colorShade(color: string, intensity: number): string {
  if (intensity < 0 || intensity > 100) {
    throw new RangeError(`colorShade: intensity must be in [0, 100], got ${intensity}`)
  }
  return `color-mix(in srgb, ${color} ${intensity}%, var(--shade-pole))`
}
