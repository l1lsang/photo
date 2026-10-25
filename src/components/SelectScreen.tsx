import { useMemo } from 'react'
import type { Settings, Shot } from '../types'
import { photoStyle } from '../lib/filters'
import { getLayout } from '../lib/layouts'
import PreviewCanvas from './PreviewCanvas'

interface Props {
  shots: Shot[]
  selected: number[]
  onSelect: (next: number[]) => void
  settings: Settings
  date?: Date
  onBack: () => void
  onNext: () => void
  notify: (message: string) => void
}

export default function SelectScreen({ shots, selected, onSelect, settings, date, onBack, onNext, notify }: Props) {
  const need = getLayout(settings.layoutId).slots.length
  const photos = useMemo(() => selected.map((i) => shots[i]?.preview), [selected, shots])
  const full = selected.length >= need

  function toggle(index: number) {
    if (selected.includes(index)) onSelect(selected.filter((i) => i !== index))
    else if (!full) onSelect([...selected, index])
    else notify(`${need}장까지 고를 수 있어요. 먼저 다른 사진의 선택을 풀어 주세요.`)
  }

  return (
    <div className="screen select-screen">
      <section className="select-main">
        <div className="screen-head">
          <div>
            <h2>마음에 드는 사진 {need}장을 골라주세요</h2>
            <p>고른 순서대로 프레임 칸에 들어가요. 한 번 더 누르면 선택이 풀려요.</p>
          </div>
          <div className="pick-count">
            <b>{selected.length}</b> / {need}
          </div>
        </div>

        <div className={`pick-grid${full ? ' full' : ''}`}>
          {shots.map((shot, i) => {
            const order = selected.indexOf(i)
            return (
              <button
                key={shot.id}
                type="button"
                className={`pick${order >= 0 ? ' picked' : ''}`}
                aria-pressed={order >= 0}
                onClick={() => toggle(i)}
              >
                <img src={shot.thumb} alt={`${i + 1}번 사진`} style={photoStyle(settings)} />
                <span className="pick-no">{i + 1}</span>
                {order >= 0 && <span className="pick-badge">{order + 1}</span>}
              </button>
            )
          })}
        </div>

        <div className="screen-actions">
          <button type="button" className="btn ghost" onClick={onBack}>
            ← 촬영 화면으로
          </button>
          <button type="button" className="btn ghost" onClick={() => onSelect([])} disabled={!selected.length}>
            선택 초기화
          </button>
        </div>
      </section>

      <aside className="select-side">
        <div className="preview-box">
          <PreviewCanvas photos={photos} settings={settings} date={date} />
        </div>
        <button type="button" className="btn primary big" disabled={!full} onClick={onNext}>
          {full ? '꾸미러 가기 →' : `${need - selected.length}장 더 골라주세요`}
        </button>
      </aside>
    </div>
  )
}
