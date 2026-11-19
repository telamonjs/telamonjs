/**
 * Color Presets for Dialog Headers and Stats
 *
 * Provides consistent color mapping for icons, backgrounds, and text.
 * Each preset includes:
 * - bg: Background color for icon containers
 * - text: Text/icon color
 * - bgLight: Light background for stat cards
 * - border: Border color for stat cards
 */

import type { ColorPreset } from '../types/dialog-header'

export interface ColorClasses {
  /** Background for icon (e.g., 'bg-blue-600') */
  bg: string
  /** Icon/text color (e.g., 'text-white') */
  icon: string
  /** Light background for cards (e.g., 'bg-blue-50') */
  bgLight: string
  /** Medium background for icon in cards (e.g., 'bg-blue-100') */
  bgMedium: string
  /** Border color (e.g., 'border-blue-200') */
  border: string
  /** Text color for stats (e.g., 'text-blue-700') */
  text: string
  /** Accent left border (e.g., 'border-l-blue-500') */
  accentBorder: string
  /** Icon gradient for accent variant (e.g., 'from-blue-500 to-blue-600') */
  iconGradient: string
  /** Icon shadow for accent variant (e.g., 'shadow-blue-500/25') */
  iconShadow: string
}

/**
 * Pre-defined color classes for each preset
 */
export const COLOR_PRESETS: Record<ColorPreset, ColorClasses> = {
  blue: {
    bg: 'bg-blue-600',
    icon: 'text-white',
    bgLight: 'bg-blue-50',
    bgMedium: 'bg-blue-100',
    border: 'border-blue-200',
    text: 'text-blue-600',
    accentBorder: 'border-l-blue-500',
    iconGradient: 'from-blue-500 to-blue-600',
    iconShadow: 'shadow-blue-500/25',
  },
  indigo: {
    bg: 'bg-indigo-600',
    icon: 'text-white',
    bgLight: 'bg-indigo-50',
    bgMedium: 'bg-indigo-100',
    border: 'border-indigo-200',
    text: 'text-indigo-600',
    accentBorder: 'border-l-indigo-500',
    iconGradient: 'from-indigo-500 to-indigo-600',
    iconShadow: 'shadow-indigo-500/25',
  },
  purple: {
    bg: 'bg-purple-600',
    icon: 'text-white',
    bgLight: 'bg-purple-50',
    bgMedium: 'bg-purple-100',
    border: 'border-purple-200',
    text: 'text-purple-600',
    accentBorder: 'border-l-violet-500',
    iconGradient: 'from-violet-500 to-purple-600',
    iconShadow: 'shadow-violet-500/25',
  },
  violet: {
    bg: 'bg-violet-600',
    icon: 'text-white',
    bgLight: 'bg-violet-50',
    bgMedium: 'bg-violet-100',
    border: 'border-violet-200',
    text: 'text-violet-600',
    accentBorder: 'border-l-violet-500',
    iconGradient: 'from-violet-500 to-violet-600',
    iconShadow: 'shadow-violet-500/25',
  },
  green: {
    bg: 'bg-green-600',
    icon: 'text-white',
    bgLight: 'bg-green-50',
    bgMedium: 'bg-green-100',
    border: 'border-green-200',
    text: 'text-green-600',
    accentBorder: 'border-l-emerald-500',
    iconGradient: 'from-emerald-500 to-green-600',
    iconShadow: 'shadow-emerald-500/25',
  },
  emerald: {
    bg: 'bg-emerald-600',
    icon: 'text-white',
    bgLight: 'bg-emerald-50',
    bgMedium: 'bg-emerald-100',
    border: 'border-emerald-200',
    text: 'text-emerald-600',
    accentBorder: 'border-l-emerald-500',
    iconGradient: 'from-emerald-500 to-emerald-600',
    iconShadow: 'shadow-emerald-500/25',
  },
  teal: {
    bg: 'bg-teal-600',
    icon: 'text-white',
    bgLight: 'bg-teal-50',
    bgMedium: 'bg-teal-100',
    border: 'border-teal-200',
    text: 'text-teal-600',
    accentBorder: 'border-l-teal-500',
    iconGradient: 'from-teal-500 to-teal-600',
    iconShadow: 'shadow-teal-500/25',
  },
  cyan: {
    bg: 'bg-cyan-600',
    icon: 'text-white',
    bgLight: 'bg-cyan-50',
    bgMedium: 'bg-cyan-100',
    border: 'border-cyan-200',
    text: 'text-cyan-600',
    accentBorder: 'border-l-cyan-500',
    iconGradient: 'from-cyan-500 to-cyan-600',
    iconShadow: 'shadow-cyan-500/25',
  },
  orange: {
    bg: 'bg-orange-600',
    icon: 'text-white',
    bgLight: 'bg-orange-50',
    bgMedium: 'bg-orange-100',
    border: 'border-orange-200',
    text: 'text-orange-600',
    accentBorder: 'border-l-orange-500',
    iconGradient: 'from-orange-400 to-orange-600',
    iconShadow: 'shadow-orange-500/25',
  },
  amber: {
    bg: 'bg-amber-600',
    icon: 'text-white',
    bgLight: 'bg-amber-50',
    bgMedium: 'bg-amber-100',
    border: 'border-amber-200',
    text: 'text-amber-600',
    accentBorder: 'border-l-amber-500',
    iconGradient: 'from-amber-400 to-orange-500',
    iconShadow: 'shadow-amber-500/25',
  },
  red: {
    bg: 'bg-red-600',
    icon: 'text-white',
    bgLight: 'bg-red-50',
    bgMedium: 'bg-red-100',
    border: 'border-red-200',
    text: 'text-red-600',
    accentBorder: 'border-l-red-500',
    iconGradient: 'from-red-500 to-rose-600',
    iconShadow: 'shadow-red-500/25',
  },
  rose: {
    bg: 'bg-rose-600',
    icon: 'text-white',
    bgLight: 'bg-rose-50',
    bgMedium: 'bg-rose-100',
    border: 'border-rose-200',
    text: 'text-rose-600',
    accentBorder: 'border-l-rose-500',
    iconGradient: 'from-rose-500 to-rose-600',
    iconShadow: 'shadow-rose-500/25',
  },
  pink: {
    bg: 'bg-pink-600',
    icon: 'text-white',
    bgLight: 'bg-pink-50',
    bgMedium: 'bg-pink-100',
    border: 'border-pink-200',
    text: 'text-pink-600',
    accentBorder: 'border-l-pink-500',
    iconGradient: 'from-pink-500 to-pink-600',
    iconShadow: 'shadow-pink-500/25',
  },
  gray: {
    bg: 'bg-gray-600',
    icon: 'text-white',
    bgLight: 'bg-gray-50',
    bgMedium: 'bg-gray-100',
    border: 'border-gray-200',
    text: 'text-gray-600',
    accentBorder: 'border-l-slate-400',
    iconGradient: 'from-slate-400 to-slate-500',
    iconShadow: 'shadow-slate-500/25',
  },
  slate: {
    bg: 'bg-slate-600',
    icon: 'text-white',
    bgLight: 'bg-slate-50',
    bgMedium: 'bg-slate-100',
    border: 'border-slate-200',
    text: 'text-slate-600',
    accentBorder: 'border-l-slate-500',
    iconGradient: 'from-slate-500 to-slate-600',
    iconShadow: 'shadow-slate-500/25',
  },
}

/**
 * Get color classes for a preset
 */
export function getColorClasses(preset: ColorPreset): ColorClasses {
  return COLOR_PRESETS[preset] || COLOR_PRESETS.gray
}

/**
 * Default gradient for dialog headers
 */
export const DEFAULT_HEADER_GRADIENT = 'from-gray-50 to-slate-50'
