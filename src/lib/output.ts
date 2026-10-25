import type { Layout, Paper } from '../types'
import { createCanvas } from './canvas'

/** 스트립은 2장을 이어 붙여 한 장에 인쇄한다 (반으로 잘라 나눠 갖기) */
export function buildPrintSheet(image: HTMLCanvasElement, layout: Layout, double: boolean): HTMLCanvasElement {
  if (!double || layout.print === 'single') return image
  const sideBySide = layout.print === 'pair-h'
  const sheet = createCanvas(
    sideBySide ? image.width * 2 : image.width,
    sideBySide ? image.height : image.height * 2,
  )
  const ctx = sheet.getContext('2d')!
  ctx.drawImage(image, 0, 0)
  ctx.drawImage(image, sideBySide ? image.width : 0, sideBySide ? 0 : image.height)
  return sheet
}

export function fileStamp(date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return (
    `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}_` +
    `${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`
  )
}

export function downloadCanvas(canvas: HTMLCanvasElement, filename: string): Promise<void> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('이미지를 만들지 못했어요'))
        return
      }
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      link.remove()
      setTimeout(() => URL.revokeObjectURL(url), 2000)
      resolve()
    }, 'image/png')
  })
}

/** 결과 이미지만 담은 인쇄 전용 영역을 잠깐 만들어 인쇄 창을 연다 */
export async function printCanvas(canvas: HTMLCanvasElement, paper: Paper): Promise<void> {
  const landscape = canvas.width > canvas.height
  const img = new Image()
  img.alt = ''
  img.src = canvas.toDataURL('image/png')
  await img.decode()

  const style = document.createElement('style')
  if (paper === 'photo') {
    const [w, h] = landscape ? [6, 4] : [4, 6]
    style.textContent = `@page { size: ${w}in ${h}in; margin: 0; }`
    // 높이를 아주 조금 줄여 빈 두 번째 페이지가 생기지 않게 한다
    img.style.cssText = `display:block;width:${w}in;height:${h - 0.02}in;object-fit:contain;`
  } else {
    // A4 에는 300dpi 실제 크기로 가운데 배치
    style.textContent = `@page { size: A4 ${landscape ? 'landscape' : 'portrait'}; margin: 12mm; }`
    img.style.cssText = `display:block;margin:0 auto;width:${canvas.width / 300}in;height:${canvas.height / 300}in;`
  }

  const area = document.createElement('div')
  area.id = 'print-area'
  area.appendChild(img)
  document.head.appendChild(style)
  document.body.appendChild(area)
  window.addEventListener(
    'afterprint',
    () => {
      style.remove()
      area.remove()
    },
    { once: true },
  )
  window.print()
}
