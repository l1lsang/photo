import type { Layout, PrintMode, Rect, Slot } from '../types'
import { createCanvas } from './canvas'
import type { FrameRecord } from './frameStore'

export interface CustomFrame {
  id: string
  name: string
  /** overlay: 투명한 칸 아래에 사진을 넣는 프레임, background: 기본 구조의 배경으로 쓰는 이미지 */
  kind: FrameRecord['kind']
  image: HTMLCanvasElement
  /** overlay 프레임이 만드는 구조 */
  layout: Layout | null
  textColor: string
  record: FrameRecord
}

export type ImportResult = { frame: CustomFrame } | { error: string }

export const FRAME_SLOTS = 4

/** 저장·인쇄 기준 크기에 맞춰 긴 변을 1800px(6인치, 300dpi)로 맞춘다 */
const LONG_SIDE = 1800
/** 투명한 칸을 찾을 때 쓰는 축소본 크기 */
const ANALYSIS_SIZE = 480

// ---------- 등록된 프레임 (렌더링에서 바로 꺼내 쓴다) ----------

const registry = new Map<string, CustomFrame>()

export function getCustomFrame(id: string): CustomFrame | undefined {
  return id ? registry.get(id) : undefined
}

export function listCustomFrames(): CustomFrame[] {
  return [...registry.values()].sort((a, b) => a.record.createdAt - b.record.createdAt)
}

export function registerFrames(frames: CustomFrame[]) {
  for (const frame of frames) registry.set(frame.id, frame)
}

export function unregisterFrame(id: string) {
  registry.delete(id)
}

// ---------- 이미지 → 프레임 ----------

export async function importFrame(file: File): Promise<ImportResult> {
  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch {
    return { error: '이미지를 열 수 없어요. PNG나 JPG 파일인지 확인해 주세요.' }
  }
  const ratio = LONG_SIDE / Math.max(bitmap.width, bitmap.height)
  const image = createCanvas(bitmap.width * ratio, bitmap.height * ratio)
  const ctx = image.getContext('2d')!
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(bitmap, 0, 0, image.width, image.height)
  bitmap.close()

  const windows = findWindows(image)
  if (windows.length > 0 && windows.length !== FRAME_SLOTS) {
    return {
      error: `투명한 사진 칸을 ${windows.length}개 찾았어요. 투명한 칸이 정확히 ${FRAME_SLOTS}개인 프레임만 쓸 수 있어요.`,
    }
  }

  const blob = await new Promise<Blob | null>((resolve) => image.toBlob(resolve, 'image/png'))
  if (!blob) return { error: '이미지를 처리하지 못했어요. 다른 파일로 시도해 주세요.' }

  const record: FrameRecord = {
    id: `frame-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    name: file.name.replace(/\.[^.]+$/, '').slice(0, 20) || '내 프레임',
    kind: windows.length ? 'overlay' : 'background',
    blob,
    width: image.width,
    height: image.height,
    slots: windows,
    textColor: isMostlyDark(image) ? '#ffffff' : '#222222',
    createdAt: Date.now(),
  }
  return { frame: buildFrame(record, image) }
}

export async function frameFromRecord(record: FrameRecord): Promise<CustomFrame> {
  const bitmap = await createImageBitmap(record.blob)
  const image = createCanvas(record.width, record.height)
  image.getContext('2d')!.drawImage(bitmap, 0, 0, image.width, image.height)
  bitmap.close()
  return buildFrame(record, image)
}

function buildFrame(record: FrameRecord, image: HTMLCanvasElement): CustomFrame {
  const layout: Layout | null =
    record.kind === 'overlay'
      ? {
          id: record.id,
          name: record.name,
          desc: '내 프레임',
          width: record.width,
          height: record.height,
          margin: 0,
          slots: record.slots,
          print: printModeFor(record.width, record.height),
          overlay: image,
        }
      : null
  return { id: record.id, name: record.name, kind: record.kind, image, layout, textColor: record.textColor, record }
}

function printModeFor(width: number, height: number): PrintMode {
  if (width / height < 0.45) return 'pair-h'
  if (height / width < 0.45) return 'pair-v'
  return 'single'
}

/** 투명한 영역 덩어리를 찾아 사진 칸으로 쓴다 (읽는 순서대로 정렬) */
function findWindows(image: HTMLCanvasElement): Slot[] {
  const ratio = Math.min(1, ANALYSIS_SIZE / Math.max(image.width, image.height))
  const small = createCanvas(image.width * ratio, image.height * ratio)
  const ctx = small.getContext('2d', { willReadFrequently: true })!
  ctx.drawImage(image, 0, 0, small.width, small.height)
  const { width: w, height: h } = small
  const pixels = ctx.getImageData(0, 0, w, h).data

  const clear = new Uint8Array(w * h)
  for (let i = 0; i < clear.length; i++) clear[i] = pixels[i * 4 + 3] < 128 ? 1 : 0

  const seen = new Uint8Array(w * h)
  const queue = new Int32Array(w * h)
  const regions: (Rect & { area: number })[] = []
  for (let start = 0; start < clear.length; start++) {
    if (!clear[start] || seen[start]) continue
    let head = 0
    let tail = 0
    const visit = (p: number) => {
      if (clear[p] && !seen[p]) {
        seen[p] = 1
        queue[tail++] = p
      }
    }
    visit(start)
    let minX = w
    let minY = h
    let maxX = 0
    let maxY = 0
    while (head < tail) {
      const p = queue[head++]
      const x = p % w
      const y = (p - x) / w
      if (x < minX) minX = x
      if (x > maxX) maxX = x
      if (y < minY) minY = y
      if (y > maxY) maxY = y
      if (x > 0) visit(p - 1)
      if (x < w - 1) visit(p + 1)
      if (y > 0) visit(p - w)
      if (y < h - 1) visit(p + w)
    }
    regions.push({ x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1, area: tail })
  }

  // 너무 작은 투명 조각(테두리 안티에일리어싱 등)이나 가느다란 틈은 사진 칸이 아니다
  const windows = regions.filter((r) => r.area >= w * h * 0.01 && r.area >= r.w * r.h * 0.5)

  // 칸 가장자리에 빈틈이 보이지 않도록 사진을 살짝 크게 깐다 (넘친 부분은 프레임이 덮는다)
  const bleed = Math.max(image.width, image.height) * 0.004
  return readingOrder(windows).map((r) => {
    const x0 = Math.max(0, r.x / ratio - bleed)
    const y0 = Math.max(0, r.y / ratio - bleed)
    const x1 = Math.min(image.width, (r.x + r.w) / ratio + bleed)
    const y1 = Math.min(image.height, (r.y + r.h) / ratio + bleed)
    return { x: Math.round(x0), y: Math.round(y0), w: Math.round(x1 - x0), h: Math.round(y1 - y0) }
  })
}

/** 위 → 아래, 같은 줄이면 왼쪽 → 오른쪽 */
function readingOrder(rects: Rect[]): Rect[] {
  const rows: Rect[][] = []
  for (const rect of [...rects].sort((a, b) => a.y - b.y)) {
    const cy = rect.y + rect.h / 2
    const row = rows.find((r) => Math.abs(r[0].y + r[0].h / 2 - cy) < Math.min(r[0].h, rect.h) * 0.5)
    if (row) row.push(rect)
    else rows.push([rect])
  }
  return rows.flatMap((row) => row.sort((a, b) => a.x - b.x))
}

function isMostlyDark(image: HTMLCanvasElement): boolean {
  const sample = createCanvas(32, 48)
  const ctx = sample.getContext('2d', { willReadFrequently: true })!
  ctx.drawImage(image, 0, 0, sample.width, sample.height)
  const pixels = ctx.getImageData(0, 0, sample.width, sample.height).data
  let sum = 0
  let count = 0
  for (let i = 0; i < pixels.length; i += 4) {
    if (pixels[i + 3] < 128) continue
    sum += 0.299 * pixels[i] + 0.587 * pixels[i + 1] + 0.114 * pixels[i + 2]
    count++
  }
  return count > 0 && sum / count < 140
}

// ---------- 템플릿 ----------

/** 기본 구조의 사진 칸을 투명하게 뚫어 둔 디자인용 밑그림 */
export function renderTemplate(layout: Layout): HTMLCanvasElement {
  const canvas = createCanvas(layout.width, layout.height)
  const ctx = canvas.getContext('2d')!
  const base = Math.min(layout.width, layout.height)
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, layout.width, layout.height)

  if (layout.title) {
    const t = layout.title
    const inset = base * 0.04
    ctx.save()
    ctx.setLineDash([12, 10])
    ctx.lineWidth = 3
    ctx.strokeStyle = '#c9bfc5'
    ctx.strokeRect(t.x + inset, t.y + inset, t.w - inset * 2, t.h - inset * 2)
    ctx.fillStyle = '#b3a8ae'
    ctx.font = `500 ${base * 0.045}px "Noto Sans KR", sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('로고 · 문구 자리', t.x + t.w / 2, t.y + t.h / 2)
    ctx.restore()
  }

  for (const slot of layout.slots) {
    ctx.save()
    ctx.translate(slot.x + slot.w / 2, slot.y + slot.h / 2)
    if (slot.rot) ctx.rotate((slot.rot * Math.PI) / 180)
    ctx.globalCompositeOperation = 'destination-out'
    ctx.fillRect(-slot.w / 2, -slot.h / 2, slot.w, slot.h)
    ctx.globalCompositeOperation = 'source-over'
    ctx.setLineDash([14, 10])
    ctx.lineWidth = 3
    ctx.strokeStyle = '#ff4f87'
    ctx.strokeRect(-slot.w / 2 - 3, -slot.h / 2 - 3, slot.w + 6, slot.h + 6)
    ctx.restore()
  }
  return canvas
}
