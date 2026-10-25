import type { FontOption, Settings, Theme } from '../types'

export const THEMES: Theme[] = [
  { id: 'white', name: '화이트', bg: '#ffffff', text: '#222222', deco: 'none' },
  { id: 'black', name: '블랙', bg: '#141414', text: '#ffffff', deco: 'none' },
  {
    id: 'pink',
    name: '러블리 핑크',
    bg: '#ffd9e6',
    text: '#e0457b',
    deco: 'hearts',
    decoColors: ['#ff8fb1', '#ffffff', '#ff5c8a'],
  },
  { id: 'sky', name: '구름 하늘', bg: ['#8fd0ff', '#e6f5ff'], text: '#2b6cb0', deco: 'clouds' },
  { id: 'film', name: '필름', bg: '#1b1b1b', text: '#f2f2f2', deco: 'film' },
  {
    id: 'checker',
    name: '레트로 체크',
    bg: '#fff3c4',
    text: '#3d2b1f',
    deco: 'checker',
    decoColors: ['#ffd36e'],
    label: '#fff8dd',
  },
  { id: 'dots', name: '민트 도트', bg: '#bfeee0', text: '#1f7a64', deco: 'dots', decoColors: ['#ffffff'] },
  {
    id: 'sunset',
    name: '선셋',
    bg: ['#ffb199', '#ff6f91', '#b06ff0'],
    text: '#ffffff',
    deco: 'sparkle',
    decoColors: ['#ffffff', '#fff3b0'],
  },
  {
    id: 'halloween',
    name: '할로윈',
    bg: '#2b1640',
    text: '#ff9f2e',
    deco: 'emoji',
    emojis: ['🎃', '🦇', '👻', '🕸️', '🍬'],
  },
  {
    id: 'xmas',
    name: '크리스마스',
    bg: '#1d4a35',
    text: '#ffffff',
    deco: 'emoji',
    emojis: ['❄️', '🎄', '⭐', '🎁', '🔔'],
  },
  { id: 'custom', name: '직접 고르기', bg: '#ffe3ec', text: '#2b2530', deco: 'none' },
]

export const FONTS: FontOption[] = [
  { family: 'Jua', name: '주아', weight: 400 },
  { family: 'Black Han Sans', name: '검은고딕', weight: 400 },
  { family: 'Do Hyeon', name: '도현', weight: 400 },
  { family: 'Gaegu', name: '개구 손글씨', weight: 700 },
  { family: 'Nanum Pen Script', name: '나눔 펜글씨', weight: 400 },
  { family: 'Noto Sans KR', name: '노토 고딕', weight: 700 },
  { family: 'Noto Serif KR', name: '노토 명조', weight: 700 },
]

export function getTheme(id: string): Theme {
  return THEMES.find((theme) => theme.id === id) ?? THEMES[0]
}

export function getFont(family: string): FontOption {
  return FONTS.find((font) => font.family === family) ?? FONTS[0]
}

export function baseColor(theme: Theme): string {
  return Array.isArray(theme.bg) ? theme.bg[0] : theme.bg
}

export function isDark(hex: string): boolean {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex)
  if (!match) return false
  const n = parseInt(match[1], 16)
  const luminance = 0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)
  return luminance < 140
}

/** '직접 고르기' 테마는 사용자가 고른 배경색으로 바꾸고 글자색은 대비가 되게 맞춘다 */
export function resolveTheme(settings: Settings): Theme {
  const theme = getTheme(settings.themeId)
  if (theme.id !== 'custom') return theme
  return { ...theme, bg: settings.customBg, text: isDark(settings.customBg) ? '#ffffff' : '#2b2530' }
}
