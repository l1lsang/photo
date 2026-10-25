export interface Rect {
  x: number
  y: number
  w: number
  h: number
}

export interface Slot extends Rect {
  /** 회전 각도(도) */
  rot?: number
}

/** pair-h: 세로 스트립 2장을 가로로, pair-v: 가로 스트립 2장을 세로로 붙여 인쇄 */
export type PrintMode = 'pair-h' | 'pair-v' | 'single'

export interface Layout {
  id: string
  name: string
  desc: string
  width: number
  height: number
  margin: number
  slots: Slot[]
  /** 문구와 날짜가 들어가는 영역 */
  title: Rect
  print: PrintMode
  /** 폴라로이드처럼 사진 뒤에 흰 카드를 깔 때 */
  card?: { pad: number; bottom: number }
}

export type Deco = 'none' | 'hearts' | 'clouds' | 'film' | 'checker' | 'dots' | 'sparkle' | 'emoji'

export interface Theme {
  id: string
  name: string
  /** 단색 또는 그라데이션 색 목록 */
  bg: string | string[]
  text: string
  deco: Deco
  decoColors?: string[]
  emojis?: string[]
  /** 배경이 복잡할 때 문구 뒤에 까는 라벨 색 */
  label?: string
}

export interface FontOption {
  family: string
  name: string
  weight: number
}

export interface FilterPreset {
  id: string
  name: string
  css: string
  /** soft-light 로 덮는 색감 [색, 강도] */
  tint?: [string, number]
  glow?: number
  grain?: number
}

export interface Adjust {
  brightness: number
  contrast: number
  saturation: number
  warmth: number
  smooth: number
  vignette: number
}

export type Paper = 'photo' | 'a4'

export interface Settings {
  layoutId: string
  themeId: string
  customBg: string
  filterId: string
  adjust: Adjust
  mirror: boolean
  radius: number
  title: string
  showDate: boolean
  font: string
  useThemeText: boolean
  textColor: string
  timer: number
  autoShoot: boolean
  sound: boolean
  deviceId: string
  printDouble: boolean
  paper: Paper
}

export interface Shot {
  id: number
  /** 카메라 원본 해상도 (저장·인쇄용) */
  full: HTMLCanvasElement
  /** 화면 미리보기용 축소본 */
  preview: HTMLCanvasElement
  thumb: string
  takenAt: number
}
