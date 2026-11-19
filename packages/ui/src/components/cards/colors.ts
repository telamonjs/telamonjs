import type { CardColor } from './types'

export interface TintedColorStyles {
  bg: string
  border: string
  text: string
  value: string
  iconBg: string
  ring: string
}

export interface OutlinedColorStyles {
  iconBg: string
  iconText: string
  ring: string
}

export interface AccentColorStyles {
  iconGradient: string
  iconShadow: string
  accentBorder: string
  ring: string
}

const tinted: Record<CardColor, TintedColorStyles> = {
  blue: {
    bg: 'bg-blue-50 dark:bg-blue-950/30',
    border: 'border-blue-200 dark:border-blue-800',
    text: 'text-blue-600 dark:text-blue-400',
    value: 'text-blue-700 dark:text-blue-300',
    iconBg: 'bg-blue-100 dark:bg-blue-900/50',
    ring: 'ring-blue-400 dark:ring-blue-600'
  },
  green: {
    bg: 'bg-green-50 dark:bg-green-950/30',
    border: 'border-green-200 dark:border-green-800',
    text: 'text-green-600 dark:text-green-400',
    value: 'text-green-700 dark:text-green-300',
    iconBg: 'bg-green-100 dark:bg-green-900/50',
    ring: 'ring-green-400 dark:ring-green-600'
  },
  yellow: {
    bg: 'bg-amber-50 dark:bg-amber-950/30',
    border: 'border-amber-200 dark:border-amber-800',
    text: 'text-amber-600 dark:text-amber-400',
    value: 'text-amber-700 dark:text-amber-300',
    iconBg: 'bg-amber-100 dark:bg-amber-900/50',
    ring: 'ring-amber-400 dark:ring-amber-600'
  },
  red: {
    bg: 'bg-red-50 dark:bg-red-950/30',
    border: 'border-red-200 dark:border-red-800',
    text: 'text-red-600 dark:text-red-400',
    value: 'text-red-700 dark:text-red-300',
    iconBg: 'bg-red-100 dark:bg-red-900/50',
    ring: 'ring-red-400 dark:ring-red-600'
  },
  purple: {
    bg: 'bg-purple-50 dark:bg-purple-950/30',
    border: 'border-purple-200 dark:border-purple-800',
    text: 'text-purple-600 dark:text-purple-400',
    value: 'text-purple-700 dark:text-purple-300',
    iconBg: 'bg-purple-100 dark:bg-purple-900/50',
    ring: 'ring-purple-400 dark:ring-purple-600'
  },
  orange: {
    bg: 'bg-orange-50 dark:bg-orange-950/30',
    border: 'border-orange-200 dark:border-orange-800',
    text: 'text-orange-600 dark:text-orange-400',
    value: 'text-orange-700 dark:text-orange-300',
    iconBg: 'bg-orange-100 dark:bg-orange-900/50',
    ring: 'ring-orange-400 dark:ring-orange-600'
  },
  gray: {
    bg: 'bg-muted/50',
    border: 'border-border',
    text: 'text-muted-foreground',
    value: 'text-foreground',
    iconBg: 'bg-slate-100 dark:bg-slate-800/50',
    ring: 'ring-slate-400 dark:ring-slate-600'
  }
}

const outlined: Record<CardColor, OutlinedColorStyles> = {
  blue: {
    iconBg: 'bg-blue-100 dark:bg-blue-900/30',
    iconText: 'text-blue-600 dark:text-blue-400',
    ring: 'ring-blue-500/30'
  },
  green: {
    iconBg: 'bg-emerald-100 dark:bg-emerald-900/30',
    iconText: 'text-emerald-600 dark:text-emerald-400',
    ring: 'ring-emerald-500/30'
  },
  yellow: {
    iconBg: 'bg-amber-100 dark:bg-amber-900/30',
    iconText: 'text-amber-600 dark:text-amber-400',
    ring: 'ring-amber-500/30'
  },
  red: {
    iconBg: 'bg-red-100 dark:bg-red-900/30',
    iconText: 'text-red-600 dark:text-red-400',
    ring: 'ring-red-500/30'
  },
  purple: {
    iconBg: 'bg-violet-100 dark:bg-violet-900/30',
    iconText: 'text-violet-600 dark:text-violet-400',
    ring: 'ring-violet-500/30'
  },
  orange: {
    iconBg: 'bg-orange-100 dark:bg-orange-900/30',
    iconText: 'text-orange-600 dark:text-orange-400',
    ring: 'ring-orange-500/30'
  },
  gray: {
    iconBg: 'bg-slate-100 dark:bg-slate-800/50',
    iconText: 'text-slate-500 dark:text-slate-400',
    ring: 'ring-slate-500/30'
  }
}

const accent: Record<CardColor, AccentColorStyles> = {
  blue: {
    iconGradient: 'from-blue-500 to-blue-600',
    iconShadow: 'shadow-blue-500/25',
    accentBorder: 'border-l-blue-500',
    ring: 'ring-blue-500/30'
  },
  green: {
    iconGradient: 'from-emerald-500 to-green-600',
    iconShadow: 'shadow-emerald-500/25',
    accentBorder: 'border-l-emerald-500',
    ring: 'ring-emerald-500/30'
  },
  yellow: {
    iconGradient: 'from-amber-400 to-orange-500',
    iconShadow: 'shadow-amber-500/25',
    accentBorder: 'border-l-amber-500',
    ring: 'ring-amber-500/30'
  },
  red: {
    iconGradient: 'from-red-500 to-rose-600',
    iconShadow: 'shadow-red-500/25',
    accentBorder: 'border-l-red-500',
    ring: 'ring-red-500/30'
  },
  purple: {
    iconGradient: 'from-violet-500 to-purple-600',
    iconShadow: 'shadow-violet-500/25',
    accentBorder: 'border-l-violet-500',
    ring: 'ring-violet-500/30'
  },
  orange: {
    iconGradient: 'from-orange-400 to-orange-600',
    iconShadow: 'shadow-orange-500/25',
    accentBorder: 'border-l-orange-500',
    ring: 'ring-orange-500/30'
  },
  gray: {
    iconGradient: 'from-slate-400 to-slate-500',
    iconShadow: 'shadow-slate-500/25',
    accentBorder: 'border-l-slate-400',
    ring: 'ring-slate-500/30'
  }
}

export const cardColors = { tinted, outlined, accent } as const
