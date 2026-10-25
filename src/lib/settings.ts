import type { Settings } from '../types'
import { DEFAULT_ADJUST, FILTERS } from './filters'
import { LAYOUTS } from './layouts'
import { FONTS, THEMES } from './themes'

const STORAGE_KEY = 'four-cut-studio:settings'

export const DEFAULT_SETTINGS: Settings = {
  layoutId: 'strip',
  themeId: 'white',
  frameId: '',
  customBg: '#ffe3ec',
  filterId: 'none',
  adjust: DEFAULT_ADJUST,
  mirror: true,
  radius: 0,
  title: '우리의 네컷 ♥',
  showDate: true,
  font: 'Jua',
  useThemeText: true,
  textColor: '#2b2530',
  timer: 5,
  autoShoot: true,
  sound: true,
  deviceId: '',
  printDouble: true,
  paper: 'photo',
}

/** 지난번에 쓰던 설정을 불러온다 (없거나 깨졌으면 기본값) */
export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_SETTINGS
    const saved = JSON.parse(raw) as Partial<Settings>
    const merged: Settings = {
      ...DEFAULT_SETTINGS,
      ...saved,
      adjust: { ...DEFAULT_ADJUST, ...saved.adjust },
    }
    if (!LAYOUTS.some((l) => l.id === merged.layoutId)) merged.layoutId = DEFAULT_SETTINGS.layoutId
    if (!THEMES.some((t) => t.id === merged.themeId)) merged.themeId = DEFAULT_SETTINGS.themeId
    if (!FILTERS.some((f) => f.id === merged.filterId)) merged.filterId = DEFAULT_SETTINGS.filterId
    if (!FONTS.some((f) => f.family === merged.font)) merged.font = DEFAULT_SETTINGS.font
    return merged
  } catch {
    return DEFAULT_SETTINGS
  }
}

export function saveSettings(settings: Settings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  } catch {
    // 저장소를 못 써도 앱은 그대로 동작한다
  }
}
