import React from 'react'
import { vi } from 'vitest'

// Mock Recharts components for testing
export const ResponsiveContainer = ({ children, height }: any) =>
  React.createElement(
    'div',
    { 'data-testid': 'responsive-container', 'data-height': height },
    children
  )

export const LineChart = ({ children, data }: any) =>
  React.createElement(
    'div',
    { 'data-testid': 'line-chart', 'data-length': data?.length },
    children
  )

export const BarChart = ({ children, data, layout }: any) =>
  React.createElement(
    'div',
    {
      'data-testid': 'bar-chart',
      'data-length': data?.length,
      'data-layout': layout,
    },
    children
  )

export const PieChart = ({ children }: any) =>
  React.createElement('div', { 'data-testid': 'pie-chart' }, children)

export const AreaChart = ({ children, data }: any) =>
  React.createElement(
    'div',
    { 'data-testid': 'area-chart', 'data-length': data?.length },
    children
  )

export const Line = ({ dataKey, stroke }: any) =>
  React.createElement('div', {
    'data-testid': `line-${dataKey}`,
    'data-stroke': stroke,
  })

export const Bar = ({ dataKey, fill, radius }: any) =>
  React.createElement('div', {
    'data-testid': `bar-${dataKey}`,
    'data-fill': fill,
    'data-radius': radius === undefined ? undefined : JSON.stringify(radius),
  })

export const Area = ({ dataKey, fill }: any) =>
  React.createElement('div', {
    'data-testid': `area-${dataKey}`,
    'data-fill': fill,
  })

export const Pie = ({ data, dataKey, nameKey, innerRadius }: any) =>
  React.createElement('div', {
    'data-testid': 'pie',
    'data-length': data?.length,
    'data-key': dataKey,
    'data-name-key': nameKey,
    'data-inner-radius': innerRadius,
  })

export const Cell = ({ fill }: any) =>
  React.createElement('div', { 'data-testid': 'cell', 'data-fill': fill })

export const XAxis = ({ dataKey, label, allowDecimals, stroke, tick }: any) =>
  React.createElement('div', {
    'data-testid': 'x-axis',
    'data-key': dataKey,
    'data-label': label?.value,
    'data-allow-decimals': allowDecimals,
    'data-stroke': stroke,
    'data-tick-fill': tick?.fill,
  })

export const YAxis = ({ label, allowDecimals, width, stroke, tick }: any) =>
  React.createElement('div', {
    'data-testid': 'y-axis',
    'data-label': label?.value,
    'data-allow-decimals': allowDecimals,
    'data-width': width,
    'data-stroke': stroke,
    'data-tick-fill': tick?.fill,
  })

export const CartesianGrid = ({ stroke }: any) =>
  React.createElement('div', {
    'data-testid': 'cartesian-grid',
    'data-stroke': stroke,
  })

export const Tooltip = ({ contentStyle }: any) =>
  React.createElement('div', {
    'data-testid': 'tooltip',
    'data-bg': contentStyle?.backgroundColor,
  })

export const Legend = () =>
  React.createElement('div', { 'data-testid': 'legend' })
