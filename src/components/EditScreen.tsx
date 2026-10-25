import { useEffect, useEffectEvent, useMemo, useState } from 'react'
import type { Adjust, Paper, Settings, Shot } from '../types'
import type { CustomFrame } from '../lib/customFrames'
import { FRAME_SLOTS, renderTemplate } from '../lib/customFrames'
import { DEFAULT_ADJUST, FILTERS, colorOverlays, photoStyle } from '../lib/filters'
import { LAYOUTS, getLayout, resolveLayout } from '../lib/layouts'
import { buildPrintSheet, downloadCanvas, fileStamp, printCanvas } from '../lib/output'
import { ensureFonts, renderComposite } from '../lib/render'
import { FONTS, THEMES } from '../lib/themes'
import PreviewCanvas from './PreviewCanvas'
import { Field, Range, Segmented, Toggle } from './ui'

interface Props {
  /** 고른 순서대로 정렬된 사진 */
  shots: Shot[]
  settings: Settings
  onChange: (patch: Partial<Settings>) => void
  date?: Date
  frames: CustomFrame[]
  onAddFrame: (file: File) => Promise<void>
  onDeleteFrame: (frame: CustomFrame) => void
  onBack: () => void
  onHome: () => void
  notify: (message: string) => void
}

const TABS = [
  { id: 'layout', label: '구조' },
  { id: 'frame', label: '프레임' },
  { id: 'retouch', label: '보정' },
  { id: 'text', label: '문구' },
] as const

type Tab = (typeof TABS)[number]['id']

const signed = (v: number) => (v > 0 ? `+${v}` : String(v))

const ADJUSTERS: { key: keyof Adjust; label: string; min: number; max: number; format?: (v: number) => string }[] = [
  { key: 'brightness', label: '밝기', min: -40, max: 40 },
  { key: 'contrast', label: '대비', min: -40, max: 40 },
  { key: 'saturation', label: '채도', min: -100, max: 100 },
  {
    key: 'warmth',
    label: '색온도',
    min: -50,
    max: 50,
    format: (v) => (v > 0 ? `따뜻하게 ${signed(v)}` : v < 0 ? `차갑게 ${v}` : '0'),
  },
  { key: 'smooth', label: '뽀샤시 피부', min: 0, max: 100 },
  { key: 'vignette', label: '비네팅 (가장자리 어둡게)', min: 0, max: 100 },
]

const PAPER_OPTIONS: { value: Paper; label: string }[] = [
  { value: 'photo', label: '4×6 인화지' },
  { value: 'a4', label: 'A4 실제 크기' },
]

const TITLE_IDEAS = ['우리의 네컷 ♥', 'BEST FRIENDS', 'HAPPY DAY', '오늘도 행복해', 'Happy Halloween']

const NO_PHOTOS: HTMLCanvasElement[] = []

export default function EditScreen({
  shots,
  settings,
  onChange,
  date,
  frames,
  onAddFrame,
  onDeleteFrame,
  onBack,
  onHome,
  notify,
}: Props) {
  const [tab, setTab] = useState<Tab>('layout')
  const [busy, setBusy] = useState(false)
  const [importing, setImporting] = useState(false)
  const layout = resolveLayout(settings)
  const previews = useMemo(() => shots.map((shot) => shot.preview), [shots])
  const sample = shots[0]
  const activeFrame = frames.find((frame) => frame.id === settings.frameId)
  // 투명 칸 프레임은 구조와 디자인을 모두 대신한다
  const overlayActive = activeFrame?.kind === 'overlay'

  async function handleImport(file: File) {
    if (importing) return
    setImporting(true)
    try {
      await onAddFrame(file)
    } finally {
      setImporting(false)
    }
  }

  async function handleTemplate() {
    const base = getLayout(settings.layoutId)
    await downloadCanvas(renderTemplate(base), `프레임템플릿_${base.name}_${base.width}x${base.height}.png`)
    notify(`'${base.name}' 템플릿을 받았어요. 분홍 점선 안쪽은 투명하게 남겨 주세요.`)
  }

  const setAdjust = (key: keyof Adjust, value: number) => onChange({ adjust: { ...settings.adjust, [key]: value } })

  async function renderFinal() {
    await ensureFonts(settings)
    return renderComposite({ photos: shots.map((shot) => shot.full), settings, scale: 1, date })
  }

  async function handleSave() {
    if (busy) return
    setBusy(true)
    try {
      await downloadCanvas(await renderFinal(), `네컷사진_${fileStamp()}.png`)
      notify('저장했어요! 다운로드 폴더를 확인해 주세요 💾')
    } catch {
      notify('저장하지 못했어요. 다시 시도해 주세요.')
    } finally {
      setBusy(false)
    }
  }

  async function handlePrint() {
    if (busy) return
    setBusy(true)
    try {
      await printCanvas(buildPrintSheet(await renderFinal(), layout, settings.printDouble), settings.paper)
    } catch {
      notify('인쇄를 준비하지 못했어요. 다시 시도해 주세요.')
    } finally {
      setBusy(false)
    }
  }

  // Ctrl+S 저장, Ctrl+P 인쇄 (브라우저 기본 동작 대신)
  const onKeyDown = useEffectEvent((e: KeyboardEvent) => {
    if (!(e.ctrlKey || e.metaKey)) return
    const key = e.key.toLowerCase()
    if (key === 's') {
      e.preventDefault()
      void handleSave()
    } else if (key === 'p') {
      e.preventDefault()
      void handlePrint()
    }
  })

  useEffect(() => {
    const handler = (e: KeyboardEvent) => onKeyDown(e)
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  return (
    <div className="screen edit-screen">
      <section className="edit-stage">
        <PreviewCanvas photos={previews} settings={settings} date={date} className="edit-canvas" />
        <p className="edit-caption">
          {layout.name} · 저장 시 {layout.width}×{layout.height}px (300dpi)
        </p>
      </section>

      <aside className="panel edit-panel">
        <div className="tabs" role="tablist">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              className={tab === t.id ? 'active' : ''}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="tab-body">
          {tab === 'layout' && (
            <>
              {overlayActive && (
                <p className="tip">
                  지금은 내 프레임 ‘{activeFrame.name}’을 쓰고 있어요. 아래 구조를 고르면 내 프레임 사용이 해제돼요.
                </p>
              )}
              <div className="option-grid">
                {LAYOUTS.map((l) => (
                  <button
                    key={l.id}
                    type="button"
                    className={`option-card${!overlayActive && l.id === settings.layoutId ? ' active' : ''}`}
                    onClick={() => onChange(overlayActive ? { layoutId: l.id, frameId: '' } : { layoutId: l.id })}
                  >
                    <span className="option-thumb">
                      <PreviewCanvas
                        photos={previews}
                        settings={{ ...settings, layoutId: l.id, frameId: overlayActive ? '' : settings.frameId }}
                        date={date}
                        scale={0.12}
                      />
                    </span>
                    <b>{l.name}</b>
                    <small>{l.desc}</small>
                  </button>
                ))}
              </div>
            </>
          )}

          {tab === 'frame' && (
            <>
              <Field label="내 프레임">
                <label
                  className={`drop-zone${importing ? ' busy' : ''}`}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault()
                    const file = e.dataTransfer.files[0]
                    if (file) void handleImport(file)
                  }}
                >
                  <input
                    type="file"
                    accept="image/png,image/webp,image/jpeg"
                    disabled={importing}
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      e.target.value = ''
                      if (file) void handleImport(file)
                    }}
                  />
                  <b>{importing ? '프레임을 살펴보는 중…' : '＋ 프레임 이미지 추가'}</b>
                  <span>클릭하거나 이미지를 끌어다 놓으세요</span>
                </label>
                <p className="tip">
                  사진 자리를 <b>투명하게 비운 PNG</b>를 올리면 칸 {FRAME_SLOTS}개를 자동으로 찾아 그 아래에 사진을
                  넣어요. 투명한 곳이 없는 이미지는 지금 고른 구조의 배경으로 깔려요.
                </p>
                <button type="button" className="btn ghost" onClick={() => void handleTemplate()}>
                  📐 ‘{getLayout(settings.layoutId).name}’ 템플릿 받기
                </button>
                {frames.length > 0 && (
                  <div className="option-grid">
                    {frames.map((frame) => (
                      <div key={frame.id} className="option-wrap">
                        <button
                          type="button"
                          className={`option-card${frame.id === settings.frameId ? ' active' : ''}`}
                          onClick={() => onChange({ frameId: frame.id })}
                        >
                          <span className="option-thumb">
                            <PreviewCanvas
                              photos={NO_PHOTOS}
                              settings={{ ...settings, frameId: frame.id }}
                              date={date}
                              scale={0.1}
                            />
                          </span>
                          <b>{frame.name}</b>
                          <small>{frame.kind === 'overlay' ? `투명 칸 ${FRAME_SLOTS}개` : '배경 이미지'}</small>
                        </button>
                        <button
                          type="button"
                          className="option-delete"
                          title="삭제"
                          aria-label={`${frame.name} 삭제`}
                          onClick={() => onDeleteFrame(frame)}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </Field>
              <Field label="기본 디자인">
                <div className="option-grid">
                  {THEMES.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      className={`option-card${!settings.frameId && t.id === settings.themeId ? ' active' : ''}`}
                      onClick={() => onChange({ themeId: t.id, frameId: '' })}
                    >
                      <span className="option-thumb">
                        <PreviewCanvas
                          photos={NO_PHOTOS}
                          settings={{ ...settings, themeId: t.id, frameId: '' }}
                          date={date}
                          scale={0.1}
                        />
                      </span>
                      <b>{t.name}</b>
                    </button>
                  ))}
                </div>
              </Field>
              {!settings.frameId && settings.themeId === 'custom' && (
                <label className="color-field">
                  <span>배경색</span>
                  <input type="color" value={settings.customBg} onChange={(e) => onChange({ customBg: e.target.value })} />
                </label>
              )}
              {!overlayActive && (
                <Range
                  label="사진 모서리 둥글게"
                  value={settings.radius}
                  min={0}
                  max={80}
                  onChange={(radius) => onChange({ radius })}
                />
              )}
            </>
          )}

          {tab === 'retouch' && (
            <>
              <Field label="필터">
                <div className="filter-grid">
                  {FILTERS.map((filter) => {
                    const look = { ...settings, filterId: filter.id }
                    return (
                      <button
                        key={filter.id}
                        type="button"
                        className={`filter-card${filter.id === settings.filterId ? ' active' : ''}`}
                        onClick={() => onChange({ filterId: filter.id })}
                      >
                        <span className="filter-sample">
                          {sample && <img src={sample.thumb} alt="" style={photoStyle(look)} />}
                          {colorOverlays(look).map(([color, alpha], i) => (
                            <i key={i} style={{ background: color, opacity: alpha }} />
                          ))}
                        </span>
                        <b>{filter.name}</b>
                      </button>
                    )
                  })}
                </div>
              </Field>
              {ADJUSTERS.map((a) => (
                <Range
                  key={a.key}
                  label={a.label}
                  value={settings.adjust[a.key]}
                  min={a.min}
                  max={a.max}
                  format={a.format}
                  onChange={(value) => setAdjust(a.key, value)}
                />
              ))}
              <Toggle
                label="🪞 거울 모드 (좌우 반전)"
                checked={settings.mirror}
                onChange={(mirror) => onChange({ mirror })}
              />
              <button
                type="button"
                className="btn ghost"
                onClick={() => onChange({ filterId: 'none', adjust: DEFAULT_ADJUST })}
              >
                ↺ 보정 초기화
              </button>
            </>
          )}

          {tab === 'text' && (
            <>
              {overlayActive && (
                <p className="tip">투명 칸 프레임을 쓰는 중에는 문구·날짜 대신 프레임 이미지에 그린 그대로 나와요.</p>
              )}
              <Field label="문구 (비워 두면 표시하지 않아요)">
                <input
                  className="text-input"
                  value={settings.title}
                  maxLength={30}
                  placeholder="예) 우리의 네컷 ♥"
                  onChange={(e) => onChange({ title: e.target.value })}
                />
                <div className="chips">
                  {TITLE_IDEAS.map((idea) => (
                    <button key={idea} type="button" className="chip" onClick={() => onChange({ title: idea })}>
                      {idea}
                    </button>
                  ))}
                </div>
              </Field>
              <Toggle label="📅 촬영 날짜 표시" checked={settings.showDate} onChange={(showDate) => onChange({ showDate })} />
              <Field label="글꼴">
                <div className="font-list">
                  {FONTS.map((font) => (
                    <button
                      key={font.family}
                      type="button"
                      className={`font-option${font.family === settings.font ? ' active' : ''}`}
                      style={{ fontFamily: `"${font.family}", sans-serif`, fontWeight: font.weight }}
                      onClick={() => onChange({ font: font.family })}
                    >
                      {font.name}
                    </button>
                  ))}
                </div>
              </Field>
              <Toggle
                label="🎨 프레임 기본 글자색 쓰기"
                checked={settings.useThemeText}
                onChange={(useThemeText) => onChange({ useThemeText })}
              />
              {!settings.useThemeText && (
                <label className="color-field">
                  <span>글자색</span>
                  <input type="color" value={settings.textColor} onChange={(e) => onChange({ textColor: e.target.value })} />
                </label>
              )}
            </>
          )}
        </div>

        <div className="edit-actions">
          <Field label="인쇄 용지">
            <Segmented value={settings.paper} options={PAPER_OPTIONS} onChange={(paper) => onChange({ paper })} />
          </Field>
          {layout.print !== 'single' && (
            <Toggle
              label="✂️ 2장 이어 붙여 인쇄 (잘라서 나눠 갖기)"
              checked={settings.printDouble}
              onChange={(printDouble) => onChange({ printDouble })}
            />
          )}
          <div className="btn-row">
            <button type="button" className="btn primary big" disabled={busy} onClick={() => void handleSave()}>
              💾 이미지 저장
            </button>
            <button type="button" className="btn dark big" disabled={busy} onClick={() => void handlePrint()}>
              🖨️ 인쇄하기
            </button>
          </div>
          <div className="btn-row">
            <button type="button" className="btn ghost" onClick={onBack}>
              ← 사진 다시 고르기
            </button>
            <button type="button" className="btn ghost" onClick={onHome}>
              🏠 처음으로
            </button>
          </div>
        </div>
      </aside>
    </div>
  )
}
