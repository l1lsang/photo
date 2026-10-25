import type { Layout, Rect, Settings, Slot, Theme } from '../types'
import { buildCssFilter, colorOverlays, getFilter } from './filters'
import { getLayout } from './layouts'
import { baseColor, getFont, isDark, resolveTheme } from './themes'

export interface RenderOptions {
  photos: readonly (HTMLCanvasElement | undefined)[]
  settings: Settings
  /** 1 = 300dpi 원본 크기 */
  scale?: number
  date?: Date
}

interface Scene {
  ctx: CanvasRenderingContext2D
  layout: Layout
  theme: Theme
  settings: Settings
  scale: number
}

interface Spot {
  x: number
  y: number
  r: number
}

const EMOJI_FONT = '"Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif'

export function createCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(width))
  canvas.height = Math.max(1, Math.round(height))
  return canvas
}

function context2d(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  return canvas.getContext('2d')!
}

/** 프레임 + 사진 4장 + 문구를 합친 최종 이미지를 만든다 */
export function renderComposite({ photos, settings, scale = 1, date = new Date() }: RenderOptions): HTMLCanvasElement {
  const layout = getLayout(settings.layoutId)
  const canvas = createCanvas(layout.width * scale, layout.height * scale)
  const ctx = context2d(canvas)
  ctx.scale(canvas.width / layout.width, canvas.height / layout.height)

  const scene: Scene = { ctx, layout, theme: resolveTheme(settings), settings, scale }
  paintBackground(scene)
  paintDecorations(scene)
  layout.slots.forEach((slot, i) => paintSlot(scene, slot, i, photos[i]))
  paintTitle(scene, date)
  return canvas
}

/** 캔버스에 쓸 웹폰트를 미리 받아 둔다 */
export async function ensureFonts(settings: Settings): Promise<void> {
  const font = getFont(settings.font)
  try {
    await Promise.all([
      document.fonts.load(`${font.weight} 64px "${font.family}"`, `${settings.title}0123456789.`),
      document.fonts.load('500 64px "Noto Sans KR"', '0123456789.'),
    ])
  } catch {
    // 오프라인이라 웹폰트를 못 받으면 기본 글꼴로 그린다
  }
}

function paintBackground({ ctx, layout, theme }: Scene) {
  if (Array.isArray(theme.bg)) {
    const gradient = ctx.createLinearGradient(0, 0, layout.width, layout.height)
    theme.bg.forEach((color, i, all) => gradient.addColorStop(i / (all.length - 1), color))
    ctx.fillStyle = gradient
  } else {
    ctx.fillStyle = theme.bg
  }
  ctx.fillRect(0, 0, layout.width, layout.height)
}

// ---------- 사진 ----------

function paintSlot({ ctx, layout, theme, settings, scale }: Scene, slot: Slot, index: number, photo?: HTMLCanvasElement) {
  const { w, h } = slot
  ctx.save()
  ctx.translate(slot.x + w / 2, slot.y + h / 2)
  if (slot.rot) ctx.rotate((slot.rot * Math.PI) / 180)

  if (layout.card) {
    const { pad, bottom } = layout.card
    ctx.save()
    // 그림자 값은 변환 행렬의 영향을 받지 않아 배율을 직접 곱한다
    ctx.shadowColor = 'rgba(0, 0, 0, 0.28)'
    ctx.shadowBlur = 30 * scale
    ctx.shadowOffsetY = 10 * scale
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(-w / 2 - pad, -h / 2 - pad, w + pad * 2, h + pad + bottom)
    ctx.restore()
  }

  ctx.beginPath()
  ctx.roundRect(-w / 2, -h / 2, w, h, Math.min(settings.radius, w / 2, h / 2))
  ctx.clip()

  if (photo) {
    ctx.drawImage(processPhoto(photo, w * scale, h * scale, settings), -w / 2, -h / 2, w, h)
  } else {
    const dark = !layout.card && isDark(baseColor(theme))
    ctx.fillStyle = dark ? 'rgba(255, 255, 255, 0.14)' : 'rgba(0, 0, 0, 0.07)'
    ctx.fillRect(-w / 2, -h / 2, w, h)
    ctx.fillStyle = dark ? 'rgba(255, 255, 255, 0.45)' : 'rgba(0, 0, 0, 0.25)'
    ctx.font = `700 ${Math.min(w, h) * 0.28}px "Noto Sans KR", sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(String(index + 1), 0, 0)
  }
  ctx.restore()
}

/** 칸 크기에 맞게 자르고 필터·보정을 입힌 사진 한 장 */
function processPhoto(source: HTMLCanvasElement, width: number, height: number, settings: Settings): HTMLCanvasElement {
  const out = createCanvas(width, height)
  const { width: w, height: h } = out
  const ctx = context2d(out)
  const filter = getFilter(settings.filterId)
  const css = buildCssFilter(settings)

  drawCover(ctx, source, w, h, settings.mirror, css)

  // 흐린 사진을 '밝은 쪽만' 겹치면 잡티가 옅어지고 뽀얗게 보인다
  const glow = Math.min(0.85, (filter.glow ?? 0) + (settings.adjust.smooth / 100) * 0.6)
  if (glow > 0) {
    ctx.save()
    ctx.globalCompositeOperation = 'lighten'
    ctx.globalAlpha = glow
    const blur = `blur(${Math.max(1, w * 0.007).toFixed(1)}px)`
    drawCover(ctx, source, w, h, settings.mirror, css === 'none' ? blur : `${css} ${blur}`)
    ctx.restore()
  }

  for (const [color, alpha] of colorOverlays(settings)) {
    ctx.save()
    ctx.globalCompositeOperation = 'soft-light'
    ctx.globalAlpha = alpha
    ctx.fillStyle = color
    ctx.fillRect(0, 0, w, h)
    ctx.restore()
  }

  if (filter.grain) {
    ctx.save()
    ctx.globalCompositeOperation = 'overlay'
    ctx.globalAlpha = filter.grain
    ctx.fillStyle = ctx.createPattern(noiseTile(), 'repeat')!
    ctx.fillRect(0, 0, w, h)
    ctx.restore()
  }

  if (settings.adjust.vignette > 0) {
    const gradient = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.hypot(w, h) / 2)
    gradient.addColorStop(0, 'rgba(0, 0, 0, 0)')
    gradient.addColorStop(1, `rgba(0, 0, 0, ${(settings.adjust.vignette / 100) * 0.7})`)
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, w, h)
  }
  return out
}

/** object-fit: cover 처럼 가운데를 기준으로 꽉 채운다 */
function drawCover(
  ctx: CanvasRenderingContext2D,
  source: HTMLCanvasElement,
  w: number,
  h: number,
  mirror: boolean,
  filter: string,
) {
  const ratio = Math.max(w / source.width, h / source.height)
  const dw = source.width * ratio
  const dh = source.height * ratio
  ctx.save()
  ctx.filter = filter
  if (mirror) {
    ctx.translate(w, 0)
    ctx.scale(-1, 1)
  }
  ctx.drawImage(source, (w - dw) / 2, (h - dh) / 2, dw, dh)
  ctx.restore()
}

let noise: HTMLCanvasElement | null = null

function noiseTile(): HTMLCanvasElement {
  if (noise) return noise
  noise = createCanvas(160, 160)
  const ctx = context2d(noise)
  const image = ctx.createImageData(160, 160)
  for (let i = 0; i < image.data.length; i += 4) {
    const v = Math.random() * 255
    image.data[i] = image.data[i + 1] = image.data[i + 2] = v
    image.data[i + 3] = 255
  }
  ctx.putImageData(image, 0, 0)
  return noise
}

// ---------- 문구 ----------

function formatDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}.${pad(date.getMonth() + 1)}.${pad(date.getDate())}`
}

function paintTitle({ ctx, layout, theme, settings }: Scene, date: Date) {
  const title = settings.title.trim()
  const dateText = settings.showDate ? formatDate(date) : ''
  if (!title && !dateText) return

  const area = layout.title
  const font = getFont(settings.font)
  const titleFont = (size: number) => `${font.weight} ${size}px "${font.family}", "Malgun Gothic", sans-serif`
  const dateFont = (size: number) => `500 ${size}px "Noto Sans KR", "Malgun Gothic", sans-serif`
  const maxWidth = area.w * 0.84
  const measure = (text: string, spec: string) => {
    ctx.font = spec
    return ctx.measureText(text).width
  }
  const fit = (text: string, size: number) => {
    const width = measure(text, titleFont(size))
    return width > maxWidth ? (size * maxWidth) / width : size
  }

  const lines: { text: string; font: string; size: number; alpha: number }[] = []
  if (area.w / area.h > 6) {
    // 가로로 긴 영역은 문구와 날짜를 한 줄에
    const text = [title, dateText].filter(Boolean).join('   ·   ')
    const size = fit(text, area.h * 0.42)
    lines.push({ text, font: titleFont(size), size, alpha: 1 })
  } else {
    const titleSize = title ? fit(title, Math.min(area.h * 0.3, area.w * 0.14)) : 0
    if (title) lines.push({ text: title, font: titleFont(titleSize), size: titleSize, alpha: 1 })
    if (dateText) {
      const size = title ? Math.max(titleSize * 0.42, area.h * 0.075) : area.h * 0.16
      lines.push({ text: dateText, font: dateFont(size), size, alpha: 0.75 })
    }
  }

  const gap = lines.length > 1 ? lines[0].size * 0.3 : 0
  const total = lines.reduce((sum, line) => sum + line.size, 0) + gap
  const cx = area.x + area.w / 2
  let y = area.y + area.h / 2 - total / 2

  ctx.save()
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  if (theme.label) {
    const width = Math.max(...lines.map((line) => measure(line.text, line.font)))
    const padX = lines[0].size * 0.6
    const padY = lines[0].size * 0.35
    const height = total + padY * 2
    ctx.fillStyle = theme.label
    ctx.beginPath()
    ctx.roundRect(cx - width / 2 - padX, y - padY, width + padX * 2, height, height / 2)
    ctx.fill()
  }
  ctx.fillStyle = settings.useThemeText ? theme.text : settings.textColor
  for (const line of lines) {
    ctx.font = line.font
    ctx.globalAlpha = line.alpha
    ctx.fillText(line.text, cx, y + line.size / 2)
    y += line.size + gap
  }
  ctx.restore()
}

// ---------- 프레임 장식 ----------

/** 같은 시드면 늘 같은 값을 내는 난수 → 미리보기와 저장본의 장식 배치가 같다 */
function seededRandom(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function hashString(text: string): number {
  let hash = 2166136261
  for (let i = 0; i < text.length; i++) hash = Math.imul(hash ^ text.charCodeAt(i), 16777619)
  return hash >>> 0
}

/** 사진과 문구를 가리지 않도록 장식을 피해야 할 영역 */
function blockedAreas(layout: Layout): Rect[] {
  const pad = layout.card?.pad ?? 0
  const bottom = layout.card?.bottom ?? 0
  const areas = layout.slots.map((slot) => {
    const grow = slot.rot ? Math.max(slot.w, slot.h) * 0.06 : 0
    return {
      x: slot.x - pad - grow,
      y: slot.y - pad - grow,
      w: slot.w + pad * 2 + grow * 2,
      h: slot.h + pad + bottom + grow * 2,
    }
  })
  const t = layout.title
  areas.push({ x: t.x + t.w * 0.12, y: t.y + t.h * 0.14, w: t.w * 0.76, h: t.h * 0.72 })
  return areas
}

/** 빈 공간에 겹치지 않게 장식 위치를 흩뿌린다 */
function scatter(
  layout: Layout,
  blocked: Rect[],
  taken: Spot[],
  count: number,
  minR: number,
  maxR: number,
  rand: () => number,
): Spot[] {
  const spots: Spot[] = []
  const overlaps = (p: Spot, x: number, y: number, r: number) => Math.hypot(p.x - x, p.y - y) < p.r + r + minR * 0.5
  for (let tries = 0; tries < count * 60 && spots.length < count; tries++) {
    const r = minR + rand() * (maxR - minR)
    const x = r + rand() * (layout.width - r * 2)
    const y = r + rand() * (layout.height - r * 2)
    const hitsArea = blocked.some((b) => x + r > b.x && x - r < b.x + b.w && y + r > b.y && y - r < b.y + b.h)
    if (hitsArea || taken.some((p) => overlaps(p, x, y, r)) || spots.some((p) => overlaps(p, x, y, r))) continue
    spots.push({ x, y, r })
  }
  return spots
}

function heartPath(ctx: CanvasRenderingContext2D, size: number) {
  const s = size / 2
  ctx.beginPath()
  ctx.moveTo(0, s * 0.9)
  ctx.bezierCurveTo(-s * 1.3, 0, -s * 0.9, -s * 1.1, 0, -s * 0.45)
  ctx.bezierCurveTo(s * 0.9, -s * 1.1, s * 1.3, 0, 0, s * 0.9)
  ctx.closePath()
}

function sparklePath(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x, y - r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.quadraticCurveTo(x, y, x, y + r)
  ctx.quadraticCurveTo(x, y, x - r, y)
  ctx.quadraticCurveTo(x, y, x, y - r)
  ctx.closePath()
}

function cloudPath(ctx: CanvasRenderingContext2D, { x, y, r }: Spot) {
  const puffs: [number, number, number][] = [
    [-0.55, 0.15, 0.42],
    [-0.1, -0.15, 0.55],
    [0.45, 0.05, 0.45],
    [0.05, 0.25, 0.45],
  ]
  ctx.beginPath()
  for (const [dx, dy, size] of puffs) {
    ctx.moveTo(x + dx * r + size * r, y + dy * r)
    ctx.arc(x + dx * r, y + dy * r, size * r, 0, Math.PI * 2)
  }
}

function paintFilmHoles(ctx: CanvasRenderingContext2D, layout: Layout) {
  const m = layout.margin
  const across = m * 0.36
  const along = m * 0.5
  const step = along * 1.9
  const vertical = layout.height >= layout.width
  const length = vertical ? layout.height : layout.width
  const count = Math.floor(length / step)
  const start = (length - count * step) / 2 + (step - along) / 2
  ctx.fillStyle = 'rgba(245, 245, 245, 0.92)'
  ctx.beginPath()
  for (let i = 0; i < count; i++) {
    const a = start + i * step
    if (vertical) {
      ctx.roundRect(m * 0.3, a, across, along, across * 0.2)
      ctx.roundRect(layout.width - m * 0.3 - across, a, across, along, across * 0.2)
    } else {
      ctx.roundRect(a, m * 0.3, along, across, across * 0.2)
      ctx.roundRect(a, layout.height - m * 0.3 - across, along, across, across * 0.2)
    }
  }
  ctx.fill()
}

function paintDecorations({ ctx, layout, theme }: Scene) {
  if (theme.deco === 'none') return
  const rand = seededRandom(hashString(`${theme.id}:${layout.id}`))
  const base = Math.min(layout.width, layout.height)
  const colors = theme.decoColors ?? ['#ffffff']
  const pick = () => colors[Math.floor(rand() * colors.length)]
  const blocked = blockedAreas(layout)

  ctx.save()
  switch (theme.deco) {
    case 'checker': {
      const cell = base * 0.05
      ctx.fillStyle = colors[0]
      for (let row = 0; row * cell < layout.height; row++) {
        for (let col = row % 2; col * cell < layout.width; col += 2) ctx.fillRect(col * cell, row * cell, cell, cell)
      }
      break
    }
    case 'dots': {
      const gap = base * 0.06
      const r = gap * 0.18
      ctx.fillStyle = colors[0]
      ctx.globalAlpha = 0.75
      ctx.beginPath()
      for (let row = 0, y = gap / 2; y < layout.height + gap; row++, y += gap * 0.866) {
        for (let x = row % 2 ? gap : gap / 2; x < layout.width + gap; x += gap) {
          ctx.moveTo(x + r, y)
          ctx.arc(x, y, r, 0, Math.PI * 2)
        }
      }
      ctx.fill()
      break
    }
    case 'film':
      paintFilmHoles(ctx, layout)
      break
    case 'hearts':
      for (const p of scatter(layout, blocked, [], 40, base * 0.022, base * 0.05, rand)) {
        ctx.save()
        ctx.translate(p.x, p.y)
        ctx.rotate((rand() - 0.5) * 0.9)
        ctx.fillStyle = pick()
        heartPath(ctx, p.r * 2)
        ctx.fill()
        ctx.restore()
      }
      break
    case 'clouds': {
      const clouds = scatter(layout, blocked, [], 12, base * 0.05, base * 0.09, rand)
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'
      for (const cloud of clouds) {
        cloudPath(ctx, cloud)
        ctx.fill()
      }
      ctx.fillStyle = '#ffffff'
      for (const p of scatter(layout, blocked, clouds, 18, base * 0.01, base * 0.022, rand)) {
        sparklePath(ctx, p.x, p.y, p.r)
        ctx.fill()
      }
      break
    }
    case 'sparkle':
      for (const p of scatter(layout, blocked, [], 30, base * 0.012, base * 0.035, rand)) {
        ctx.fillStyle = pick()
        sparklePath(ctx, p.x, p.y, p.r)
        ctx.fill()
      }
      break
    case 'emoji': {
      const emojis = theme.emojis ?? ['⭐']
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      for (const p of scatter(layout, blocked, [], 28, base * 0.025, base * 0.05, rand)) {
        ctx.save()
        ctx.translate(p.x, p.y)
        ctx.rotate((rand() - 0.5) * 0.7)
        ctx.font = `${p.r * 1.8}px ${EMOJI_FONT}`
        ctx.fillText(emojis[Math.floor(rand() * emojis.length)], 0, 0)
        ctx.restore()
      }
      break
    }
  }
  ctx.restore()
}
