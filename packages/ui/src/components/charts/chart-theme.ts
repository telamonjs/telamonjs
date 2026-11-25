/**
 * Theme tokens for the Recharts chrome. Recharts' own defaults (#666 axis line
 * and ticks, #ccc grid) are light-only; these follow `.dark` through the CSS
 * variables, same as the tooltip. Series colors are a separate, explicit prop.
 */
const AXIS_COLOR = 'hsl(var(--muted-foreground))'

/** Spread on every `<XAxis>` / `<YAxis>`. */
export const AXIS_PROPS = {
  stroke: AXIS_COLOR,
  tick: { fill: AXIS_COLOR },
}

export const GRID_STROKE = 'hsl(var(--border))'

export const TOOLTIP_CONTENT_STYLE = {
  backgroundColor: 'hsl(var(--background))',
  border: '1px solid hsl(var(--border))',
  borderRadius: '0.5rem',
}
