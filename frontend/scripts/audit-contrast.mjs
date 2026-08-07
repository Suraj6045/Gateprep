import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(scriptDir, '..')
const appCssPath = path.join(rootDir, 'src/index.css')

const AA_NORMAL_TEXT = 4.5

function read(filePath) {
  return fs.readFileSync(filePath, 'utf8')
}

function extractBlock(css, selector) {
  const selectorIndex = css.indexOf(selector)
  if (selectorIndex === -1) {
    throw new Error(`Missing CSS selector: ${selector}`)
  }

  const start = css.indexOf('{', selectorIndex)
  let depth = 0

  for (let index = start; index < css.length; index += 1) {
    if (css[index] === '{') depth += 1
    if (css[index] === '}') depth -= 1
    if (depth === 0) return css.slice(start + 1, index)
  }

  throw new Error(`Unclosed CSS block: ${selector}`)
}

function extractVars(cssBlock) {
  return Object.fromEntries(
    [...cssBlock.matchAll(/--([\w-]+):\s*(#[0-9a-f]{6}|#[0-9a-f]{3}|var\(--[\w-]+\))/gi)]
      .map(([, name, value]) => [name, value.toLowerCase()])
  )
}

const palette = {
  'sky-300': '#7dd3fc', 'sky-400': '#38bdf8', 'sky-500': '#0ea5e9', 'sky-600': '#0284c7', 'sky-700': '#0369a1', 'sky-800': '#075985',
  'green-300': '#86efac', 'green-400': '#4ade80', 'green-700': '#15803d', 'green-800': '#166534',
  'amber-300': '#fcd34d', 'amber-400': '#fbbf24', 'amber-500': '#f59e0b', 'amber-800': '#92400e',
  'red-300': '#fca5a5', 'red-400': '#f87171', 'red-600': '#dc2626', 'red-700': '#b91c1c',
  'purple-400': '#c084fc', 'purple-700': '#7e22ce',
  'orange-400': '#fb923c', 'orange-500': '#f97316', 'orange-800': '#9a3412',
  'slate-400': '#94a3b8', 'slate-500': '#64748b', 'slate-600': '#475569', 'slate-700': '#334155',
  'gray-200': '#e5e7eb', 'gray-700': '#374151',
  'white': '#ffffff', 'black': '#000000',
}

function hexToRgb(hex) {
  const normalized = hex.length === 4
    ? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`
    : hex

  return [0, 2, 4].map(offset => parseInt(normalized.slice(1 + offset, 3 + offset), 16) / 255)
}

function luminance(hex) {
  return hexToRgb(hex)
    .map(channel => channel <= 0.03928
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4)
    .reduce((sum, channel, index) => sum + channel * [0.2126, 0.7152, 0.0722][index], 0)
}

function contrastRatio(foreground, background) {
  const [lighter, darker] = [luminance(foreground), luminance(background)]
    .sort((left, right) => right - left)

  return (lighter + 0.05) / (darker + 0.05)
}

function resolveColor(value, themeVars) {
  if (value.startsWith('var(')) {
    const varName = value.match(/--([\w-]+)/)?.[1]
    if (!varName || !themeVars[varName]) {
      throw new Error(`Cannot resolve CSS variable: ${value}`)
    }
    return resolveColor(themeVars[varName], themeVars)
  }

  return value.toLowerCase()
}

const appCss = read(appCssPath)
const darkVars = extractVars(extractBlock(appCss, ':root'))
const lightVars = {
  ...darkVars,
  ...extractVars(extractBlock(appCss, '[data-theme="light"]')),
}

const themes = {
  dark: darkVars,
  light: lightVars,
}

const checks = []

function addCheck(label, themeName, foreground, background) {
  const themeVars = themes[themeName]
  const fg = resolveColor(foreground, themeVars)
  const bg = resolveColor(background, themeVars)
  const ratio = contrastRatio(fg, bg)

  checks.push({ label, themeName, foreground: fg, background: bg, ratio })
}

for (const [themeName, themeVars] of Object.entries(themes)) {
  const surfaceBackgrounds = ['bg', 'bg-card', 'bg-panel', 'sidebar-bg']
  const textTokens = [
    'text',
    'text-muted',
    'success-text',
    'danger-text',
    'warning-text',
    'info-text',
    'marked-text',
  ]

  for (const background of surfaceBackgrounds) {
    for (const foreground of textTokens) {
      addCheck(`${foreground} on ${background}`, themeName, themeVars[foreground], themeVars[background])
    }
  }

  addCheck('header text', themeName, themeVars['header-text'], themeVars['header-bg'])
  addCheck('header muted text', themeName, themeVars['header-muted'], themeVars['header-bg'])
  addCheck('header accent text', themeName, themeVars['header-accent'], themeVars['header-bg'])
  addCheck('header danger text', themeName, themeName === 'light' ? themeVars['danger-text'] : palette['red-400'], themeVars['header-bg'])
}

const darkSurfaceClasses = {
  'text-sky-300': palette['sky-300'],
  'text-sky-400': palette['sky-400'],
  'text-sky-500': palette['sky-500'],
  'text-green-300': palette['green-300'],
  'text-green-400': palette['green-400'],
  'text-amber-300': palette['amber-300'],
  'text-amber-400': palette['amber-400'],
  'text-red-300': palette['red-300'],
  'text-red-400': palette['red-400'],
  'text-purple-400': palette['purple-400'],
  'text-orange-400': palette['orange-400'],
  'text-orange-500 compatibility': palette['orange-400'],
  'text-slate-400': palette['slate-400'],
  'text-slate-500/600/700 compatibility': darkVars['text-muted'],
  'text-*-400 opacity compatibility': darkVars['text-muted'],
}

const lightSurfaceClasses = {
  'text-sky-300/400/500 compatibility': palette['sky-700'],
  'text-green-300/400 compatibility': palette['green-800'],
  'text-amber-300/400 compatibility': palette['amber-800'],
  'text-red-300/400 compatibility': palette['red-700'],
  'text-purple-400 compatibility': palette['purple-700'],
  'text-orange-400/500 compatibility': palette['orange-800'],
  'text-slate-* compatibility': lightVars['text-muted'],
}

for (const [className, foreground] of Object.entries(darkSurfaceClasses)) {
  for (const background of ['bg', 'bg-card', 'bg-panel']) {
    addCheck(`${className} on ${background}`, 'dark', foreground, darkVars[background])
  }
}

for (const [className, foreground] of Object.entries(lightSurfaceClasses)) {
  for (const background of ['bg', 'bg-card', 'bg-panel']) {
    addCheck(`${className} on ${background}`, 'light', foreground, lightVars[background])
  }
}

const componentChecks = [
  ['btn-primary', 'white', 'sky-700'],
  ['btn-primary hover', 'white', 'sky-800'],
  ['bg-sky-600 utility override', 'white', 'sky-700'],
  ['hover:bg-sky-600 utility override', 'white', 'sky-800'],
  ['btn-danger', 'white', 'red-600'],
  ['btn-danger hover', 'white', 'red-700'],
  ['btn-success', 'white', 'green-700'],
  ['btn-success hover', 'white', 'green-800'],
  ['bg-amber-500 utility override', 'white', 'amber-800'],
  ['q-dot not visited', 'gray-700', 'gray-200'],
  ['q-dot not answered', 'white', 'red-700'],
  ['q-dot answered', 'white', 'green-700'],
  ['q-dot marked', 'white', 'purple-700'],
  ['calculator operator', 'white', '#1e4080'],
  ['calculator equals', 'white', 'green-700'],
  ['calculator clear', 'white', 'red-600'],
  ['calculator backspace', 'white', 'amber-800'],
]

for (const [label, foregroundKey, backgroundKey] of componentChecks) {
  const foreground = palette[foregroundKey] ?? foregroundKey
  const background = palette[backgroundKey] ?? backgroundKey

  addCheck(label, 'dark', foreground, background)
  addCheck(label, 'light', foreground, background)
}

const failures = checks
  .filter(check => check.ratio < AA_NORMAL_TEXT)
  .sort((left, right) => left.ratio - right.ratio)

if (failures.length > 0) {
  console.error(`WCAG AA contrast audit failed: ${failures.length} pair(s) below ${AA_NORMAL_TEXT}:1`)
  for (const failure of failures) {
    console.error(
      `- [${failure.themeName}] ${failure.label}: ${failure.ratio.toFixed(2)}:1 ` +
      `(${failure.foreground} on ${failure.background})`
    )
  }
  process.exit(1)
}

const lowest = [...checks]
  .sort((left, right) => left.ratio - right.ratio)
  .slice(0, 8)

console.log(`WCAG AA contrast audit passed: ${checks.length} text pairs are >= ${AA_NORMAL_TEXT}:1`)
console.log(`Palette source: hardcoded`)
console.log('Lowest passing pairs:')
for (const check of lowest) {
  console.log(`- [${check.themeName}] ${check.label}: ${check.ratio.toFixed(2)}:1`)
}
