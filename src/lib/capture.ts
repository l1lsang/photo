import type { Shot } from '../types'
import { createCanvas } from './canvas'

let shotSeq = 0

function scaledCopy(source: HTMLCanvasElement, maxWidth: number): HTMLCanvasElement {
  const ratio = Math.min(1, maxWidth / source.width)
  const canvas = createCanvas(source.width * ratio, source.height * ratio)
  const ctx = canvas.getContext('2d')!
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height)
  return canvas
}

/** 비디오의 현재 화면을 원본 그대로 저장한다 (거울 모드·필터는 그릴 때 적용) */
export function captureFrame(video: HTMLVideoElement): Shot {
  const full = createCanvas(video.videoWidth, video.videoHeight)
  full.getContext('2d')!.drawImage(video, 0, 0, full.width, full.height)
  return {
    id: ++shotSeq,
    full,
    preview: scaledCopy(full, 960),
    thumb: scaledCopy(full, 480).toDataURL('image/jpeg', 0.85),
    takenAt: Date.now(),
  }
}
