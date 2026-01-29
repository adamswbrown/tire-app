/**
 * Survey.js Theme Configuration
 * Matches the existing TIRE App styling
 */
import type { ITheme } from 'survey-core'

export const tireAppTheme: ITheme = {
  themeName: 'tireapp',
  colorPalette: 'light',
  isPanelless: false,
  cssVariables: {
    // Colors - match Tailwind defaults and app styling
    '--sjs-primary-backcolor': '#3b82f6', // blue-500
    '--sjs-primary-backcolor-light': '#eff6ff', // blue-50
    '--sjs-primary-backcolor-dark': '#2563eb', // blue-600
    '--sjs-primary-forecolor': '#ffffff',
    '--sjs-primary-forecolor-light': '#ffffff',

    '--sjs-secondary-backcolor': '#6b7280', // gray-500
    '--sjs-secondary-forecolor': '#ffffff',

    // General
    '--sjs-general-backcolor': '#ffffff',
    '--sjs-general-backcolor-dim': '#f9fafb', // gray-50
    '--sjs-general-backcolor-dim-light': '#f3f4f6', // gray-100
    '--sjs-general-forecolor': '#1f2937', // gray-800
    '--sjs-general-forecolor-light': '#6b7280', // gray-500
    '--sjs-general-dim-forecolor': '#374151', // gray-700
    '--sjs-general-dim-forecolor-light': '#9ca3af', // gray-400

    // Borders
    '--sjs-border-default': '#e5e7eb', // gray-200
    '--sjs-border-light': '#f3f4f6', // gray-100
    '--sjs-border-inside': '#e5e7eb',

    // Typography
    '--sjs-font-family': 'ui-sans-serif, system-ui, -apple-system, sans-serif',
    '--sjs-font-size': '14px',
    '--sjs-font-questiontitle-size': '14px',
    '--sjs-font-questiontitle-weight': '500',
    '--sjs-font-questiondescription-size': '12px',

    // Sizing
    '--sjs-base-unit': '8px',
    '--sjs-corner-radius': '6px',

    // Shadows
    '--sjs-shadow-small': '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    '--sjs-shadow-medium': '0 4px 6px -1px rgb(0 0 0 / 0.1)',
    '--sjs-shadow-large': '0 10px 15px -3px rgb(0 0 0 / 0.1)',

    // Special
    '--sjs-special-red': '#ef4444', // red-500
    '--sjs-special-red-light': '#fef2f2', // red-50
    '--sjs-special-green': '#22c55e', // green-500
    '--sjs-special-green-light': '#f0fdf4', // green-50
    '--sjs-special-yellow': '#eab308', // yellow-500
    '--sjs-special-yellow-light': '#fefce8', // yellow-50
    '--sjs-special-blue': '#3b82f6', // blue-500
    '--sjs-special-blue-light': '#eff6ff', // blue-50
  },
}

// TIRE category colors for custom styling
export const TIRE_COLORS = {
  Tolerate: {
    bg: '#3b82f6', // blue-500
    bgLight: '#eff6ff', // blue-50
    text: '#1d4ed8', // blue-700
  },
  Invest: {
    bg: '#22c55e', // green-500
    bgLight: '#f0fdf4', // green-50
    text: '#15803d', // green-700
  },
  Retain: {
    bg: '#a855f7', // purple-500
    bgLight: '#faf5ff', // purple-50
    text: '#7e22ce', // purple-700
  },
  Replace: {
    bg: '#eab308', // yellow-500
    bgLight: '#fefce8', // yellow-50
    text: '#a16207', // yellow-700
  },
  Eliminate: {
    bg: '#ef4444', // red-500
    bgLight: '#fef2f2', // red-50
    text: '#b91c1c', // red-700
  },
} as const

export type TireCategory = keyof typeof TIRE_COLORS
