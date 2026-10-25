import type { CSSProperties } from 'react'
import type { Adjust, FilterPreset, Settings } from '../types'

export const FILTERS: FilterPreset[] = [
  { id: 'none', name: '원본', css: '' },
  { id: 'bright', name: '뽀샤시', css: 'brightness(1.1) contrast(0.92) saturate(1.08)', glow: 0.35 },
  { id: 'mono', name: '흑백', css: 'grayscale(1) contrast(1.12) brightness(1.03)' },
  {
    id: 'vintage',
    name: '빈티지',
    css: 'sepia(0.35) contrast(0.92) saturate(0.85) brightness(1.04)',
    tint: ['#ffb36b', 0.15],
    grain: 0.12,
  },
  { id: 'warm', name: '웜톤', css: 'saturate(1.12) brightness(1.03)', tint: ['#ff9a3c', 0.22] },
  { id: 'cool', name: '쿨톤', css: 'saturate(0.95) brightness(1.04)', tint: ['#4aa3ff', 0.22] },
  {
    id: 'film',
    name: '필름',
    css: 'contrast(1.12) saturate(0.82) brightness(0.98)',
    tint: ['#00a07a', 0.1],
    grain: 0.18,
  },
  { id: 'vivid', name: '비비드', css: 'saturate(1.45) contrast(1.08)' },
  {
    id: 'dreamy',
    name: '몽환',
    css: 'brightness(1.08) contrast(0.85) saturate(0.8) hue-rotate(-8deg)',
    tint: ['#ff9ad5', 0.18],
    glow: 0.3,
  },
]

export const DEFAULT_ADJUST: Adjust = {
  brightness: 0,
  contrast: 0,
  saturation: 0,
  warmth: 0,
  smooth: 0,
  vignette: 0,
}

type Look = Pick<Settings, 'filterId' | 'adjust'>

export function getFilter(id: string): FilterPreset {
  return FILTERS.find((filter) => filter.id === id) ?? FILTERS[0]
}

export function buildCssFilter({ filterId, adjust }: Look): string {
  const parts = [getFilter(filterId).css]
  if (adjust.brightness) parts.push(`brightness(${1 + adjust.brightness / 100})`)
  if (adjust.contrast) parts.push(`contrast(${1 + adjust.contrast / 100})`)
  if (adjust.saturation) parts.push(`saturate(${1 + adjust.saturation / 100})`)
  return parts.filter(Boolean).join(' ') || 'none'
}

/** soft-light 로 덮을 색 목록: 필터 고유 색감 + 색온도 */
export function colorOverlays({ filterId, adjust }: Look): [string, number][] {
  const overlays: [string, number][] = []
  const tint = getFilter(filterId).tint
  if (tint) overlays.push(tint)
  if (adjust.warmth) {
    overlays.push([adjust.warmth > 0 ? '#ff8a1f' : '#2f86ff', (Math.abs(adjust.warmth) / 50) * 0.35])
  }
  return overlays
}

/** 라이브 화면·썸네일용 근사치 (정확한 결과는 캔버스 미리보기) */
export function photoStyle(look: Look & Pick<Settings, 'mirror'>): CSSProperties {
  return { filter: buildCssFilter(look), transform: look.mirror ? 'scaleX(-1)' : undefined }
}
