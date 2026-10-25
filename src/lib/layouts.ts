import type { Layout, Settings, Slot } from '../types'
import { getCustomFrame } from './customFrames'

// 모든 좌표는 300dpi 인쇄 기준 픽셀입니다 (600px = 2인치)

/** 같은 크기의 칸 4개를 세로로 쌓는다 */
function column(x: number, top: number, w: number, h: number, gap: number): Slot[] {
  return [0, 1, 2, 3].map((i) => ({ x, y: top + i * (h + gap), w, h }))
}

/** 같은 크기의 칸 4개를 가로로 늘어놓는다 */
function row(left: number, y: number, w: number, h: number, gap: number): Slot[] {
  return [0, 1, 2, 3].map((i) => ({ x: left + i * (w + gap), y, w, h }))
}

/** 같은 크기의 칸 4개를 2×2 로 놓는다 */
function grid(left: number, top: number, w: number, h: number, gap: number): Slot[] {
  return [0, 1, 2, 3].map((i) => ({ x: left + (i % 2) * (w + gap), y: top + Math.floor(i / 2) * (h + gap), w, h }))
}

export const LAYOUTS: Layout[] = [
  {
    id: 'strip',
    name: '클래식 세로',
    desc: '2×6 스트립',
    width: 600,
    height: 1800,
    margin: 40,
    slots: column(40, 40, 520, 360, 24),
    title: { x: 0, y: 1552, w: 600, h: 248 },
    print: 'pair-h',
  },
  {
    id: 'strip-slim',
    name: '슬림 세로',
    desc: '얇은 경계선',
    width: 600,
    height: 1800,
    margin: 24,
    slots: column(24, 24, 552, 380, 10),
    title: { x: 0, y: 1574, w: 600, h: 226 },
    print: 'pair-h',
  },
  {
    id: 'strip-top',
    name: '로고 위 세로',
    desc: '문구가 위에',
    width: 600,
    height: 1800,
    margin: 30,
    slots: column(30, 230, 540, 374, 14),
    title: { x: 0, y: 0, w: 600, h: 230 },
    print: 'pair-h',
  },
  {
    id: 'grid',
    name: '2×2 그리드',
    desc: '4×6 바둑판',
    width: 1200,
    height: 1800,
    margin: 60,
    slots: grid(60, 70, 525, 700, 30),
    title: { x: 0, y: 1500, w: 1200, h: 300 },
    print: 'single',
  },
  {
    id: 'grid-slim',
    name: '2×2 슬림',
    desc: '얇은 경계선',
    width: 1200,
    height: 1800,
    margin: 40,
    slots: grid(40, 40, 552, 737, 16),
    title: { x: 0, y: 1530, w: 1200, h: 270 },
    print: 'single',
  },
  {
    id: 'grid-frame',
    name: '2×2 굵은 틀',
    desc: '넓은 하단 띠',
    width: 1200,
    height: 1800,
    margin: 80,
    slots: grid(80, 80, 516, 666, 8),
    title: { x: 0, y: 1420, w: 1200, h: 380 },
    print: 'single',
  },
  {
    id: 'grid-top',
    name: '로고 위 2×2',
    desc: '문구가 위에',
    width: 1200,
    height: 1800,
    margin: 50,
    slots: grid(50, 290, 540, 720, 20),
    title: { x: 0, y: 0, w: 1200, h: 290 },
    print: 'single',
  },
  {
    id: 'wide',
    name: '가로 스트립',
    desc: '6×2 파노라마',
    width: 1800,
    height: 600,
    margin: 40,
    slots: row(40, 40, 415, 440, 20),
    title: { x: 0, y: 480, w: 1800, h: 120 },
    print: 'pair-v',
  },
  {
    id: 'big',
    name: '빅 원 + 3',
    desc: '메인 1장 강조',
    width: 1200,
    height: 1800,
    margin: 60,
    slots: [
      { x: 60, y: 60, w: 1080, h: 880 },
      { x: 60, y: 970, w: 340, h: 440 },
      { x: 430, y: 970, w: 340, h: 440 },
      { x: 800, y: 970, w: 340, h: 440 },
    ],
    title: { x: 0, y: 1410, w: 1200, h: 390 },
    print: 'single',
  },
  {
    id: 'cinema',
    name: '시네마',
    desc: '와이드 영화 장면',
    width: 1200,
    height: 1800,
    margin: 60,
    slots: column(60, 60, 1080, 330, 24),
    title: { x: 0, y: 1452, w: 1200, h: 348 },
    print: 'single',
  },
  {
    id: 'polaroid',
    name: '폴라로이드',
    desc: '흩뿌린 즉석사진',
    width: 1200,
    height: 1800,
    margin: 60,
    card: { pad: 24, bottom: 96 },
    slots: [
      { x: 85, y: 80, w: 460, h: 480, rot: -5 },
      { x: 655, y: 130, w: 460, h: 480, rot: 4 },
      { x: 95, y: 730, w: 460, h: 480, rot: 3 },
      { x: 645, y: 780, w: 460, h: 480, rot: -4 },
    ],
    title: { x: 0, y: 1400, w: 1200, h: 400 },
    print: 'single',
  },
  {
    id: 'zigzag',
    name: '지그재그',
    desc: '엇갈린 배치',
    width: 1200,
    height: 1800,
    margin: 60,
    slots: [
      { x: 60, y: 60, w: 525, h: 620 },
      { x: 615, y: 220, w: 525, h: 620 },
      { x: 60, y: 710, w: 525, h: 620 },
      { x: 615, y: 870, w: 525, h: 620 },
    ],
    title: { x: 0, y: 1500, w: 1200, h: 300 },
    print: 'single',
  },
]

export function getLayout(id: string): Layout {
  return LAYOUTS.find((layout) => layout.id === id) ?? LAYOUTS[0]
}

/** 투명 칸이 있는 내 프레임을 골랐다면 그 구조를, 아니면 고른 기본 구조를 쓴다 */
export function resolveLayout(settings: Pick<Settings, 'layoutId' | 'frameId'>): Layout {
  return getCustomFrame(settings.frameId)?.layout ?? getLayout(settings.layoutId)
}
