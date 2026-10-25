import { useEffect, useRef } from 'react'
import type { Settings } from '../types'
import { getLayout } from '../lib/layouts'
import { ensureFonts, renderComposite } from '../lib/render'

interface Props {
  photos: readonly (HTMLCanvasElement | undefined)[]
  settings: Settings
  date?: Date
  scale?: number
  className?: string
}

/** 설정이 바뀔 때마다 한 프레임에 한 번만 다시 그리는 결과 미리보기 */
export default function PreviewCanvas({ photos, settings, date, scale = 0.5, className }: Props) {
  const ref = useRef<HTMLCanvasElement>(null)
  const layout = getLayout(settings.layoutId)

  useEffect(() => {
    let cancelled = false
    const frame = requestAnimationFrame(() => {
      void ensureFonts(settings).then(() => {
        const canvas = ref.current
        if (cancelled || !canvas) return
        const result = renderComposite({ photos, settings, scale, date })
        canvas.width = result.width
        canvas.height = result.height
        canvas.getContext('2d')!.drawImage(result, 0, 0)
      })
    })
    return () => {
      cancelled = true
      cancelAnimationFrame(frame)
    }
  }, [photos, settings, date, scale])

  return (
    <canvas
      ref={ref}
      className={className}
      width={Math.round(layout.width * scale)}
      height={Math.round(layout.height * scale)}
      role="img"
      aria-label={`${layout.name} 미리보기`}
    />
  )
}
