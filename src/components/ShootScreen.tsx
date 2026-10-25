import { useEffect, useEffectEvent, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import type { Settings, Shot } from '../types'
import { useCamera } from '../hooks/useCamera'
import { captureFrame } from '../lib/capture'
import { FILTERS, buildCssFilter, colorOverlays, photoStyle } from '../lib/filters'
import { resolveLayout } from '../lib/layouts'
import { playBeep, playShutter } from '../lib/sound'
import { Field, Segmented, Toggle } from './ui'

interface Props {
  settings: Settings
  onChange: (patch: Partial<Settings>) => void
  shots: Shot[]
  maxShots: number
  onCapture: (shot: Shot) => void
  onReset: () => void
  onNext: () => void
}

const TIMER_OPTIONS = [3, 5, 10].map((sec) => ({ value: sec, label: `${sec}초` }))
const MODE_OPTIONS = [
  { value: true, label: '자동 연속' },
  { value: false, label: '한 장씩' },
]

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

export default function ShootScreen({ settings, onChange, shots, maxShots, onCapture, onReset, onNext }: Props) {
  const { videoRef, devices, ready, error, activeDeviceId, retry } = useCamera(settings.deviceId)
  const [running, setRunning] = useState(false)
  const [count, setCount] = useState<number | null>(null)
  const [flashKey, setFlashKey] = useState(0)
  const [aspect, setAspect] = useState(16 / 9)
  const runningRef = useRef(false)
  const abortRef = useRef(false)
  // 촬영 도중에 바꾼 타이머·효과음 설정도 바로 반영되도록
  const settingsRef = useRef(settings)

  useEffect(() => {
    settingsRef.current = settings
  })

  useEffect(
    () => () => {
      abortRef.current = true
    },
    [],
  )

  const need = resolveLayout(settings).slots.length
  const done = shots.length >= maxShots

  // 중지 버튼에 바로 반응하도록 잘게 나눠 기다린다
  async function wait(ms: number) {
    const end = performance.now() + ms
    while (!abortRef.current && performance.now() < end) await sleep(Math.min(50, end - performance.now()))
    return !abortRef.current
  }

  async function toggleShooting() {
    if (runningRef.current) {
      abortRef.current = true
      return
    }
    if (!ready || done) return
    runningRef.current = true
    abortRef.current = false
    setRunning(true)
    let taken = shots.length
    try {
      while (taken < maxShots) {
        for (let n = settingsRef.current.timer; n > 0; n--) {
          setCount(n)
          if (settingsRef.current.sound) playBeep(n === 1 ? 1320 : 880)
          if (!(await wait(1000))) return
        }
        setCount(null)
        const video = videoRef.current
        if (!video || !video.videoWidth) return
        onCapture(captureFrame(video))
        taken++
        setFlashKey((k) => k + 1)
        if (settingsRef.current.sound) playShutter()
        if (!settingsRef.current.autoShoot || taken >= maxShots) break
        if (!(await wait(1200))) return
      }
    } finally {
      runningRef.current = false
      setRunning(false)
      setCount(null)
    }
    if (taken >= maxShots && (await wait(1000))) onNext()
  }

  const onKeyDown = useEffectEvent((e: KeyboardEvent) => {
    if (e.code !== 'Space' || e.repeat) return
    const target = e.target as HTMLElement
    if (target.closest('input, select, textarea')) return
    e.preventDefault()
    // 포커스된 버튼이 스페이스로 한 번 더 눌리지 않게
    if (target instanceof HTMLButtonElement) target.blur()
    void toggleShooting()
  })

  useEffect(() => {
    const handler = (e: KeyboardEvent) => onKeyDown(e)
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const hint = !ready
    ? null
    : done
      ? `${maxShots}장을 모두 찍었어요! 이제 사진을 골라볼까요?`
      : running
        ? null
        : settings.autoShoot
          ? `시작하면 ${settings.timer}초 간격으로 ${maxShots - shots.length}장을 자동으로 찍어요`
          : `누를 때마다 ${settings.timer}초 뒤에 한 장씩 찍어요`
  const shutterLabel = running ? '■ 중지' : done ? '✔ 촬영 완료' : shots.length ? '● 이어서 촬영' : '● 촬영 시작'
  const aspectStyle = { '--ar': aspect } as CSSProperties

  return (
    <div className="screen shoot-screen">
      <section className="stage-col">
        <div className="stage">
          <div className="video-box" style={aspectStyle}>
            <video
              ref={videoRef}
              className="stage-video"
              style={{ filter: buildCssFilter(settings), transform: settings.mirror ? 'scaleX(-1)' : undefined }}
              autoPlay
              muted
              playsInline
              onLoadedMetadata={(e) => {
                const video = e.currentTarget
                if (video.videoWidth && video.videoHeight) setAspect(video.videoWidth / video.videoHeight)
              }}
            />
            {colorOverlays(settings).map(([color, alpha], i) => (
              <div key={i} className="stage-tint" style={{ background: color, opacity: alpha }} />
            ))}
            {settings.adjust.vignette > 0 && (
              <div className="stage-vignette" style={{ opacity: settings.adjust.vignette / 100 }} />
            )}
            <div className="stage-badge">
              {running && <i className="rec" />}
              📸 {shots.length} / {maxShots}
            </div>
            {settings.mirror && <div className="stage-chip">🪞 거울 모드</div>}
            {count !== null && (
              <div className="countdown" key={`${shots.length}-${count}`}>
                <b>{count}</b>
                <small>{shots.length + 1}번째 사진</small>
              </div>
            )}
            {flashKey > 0 && <div key={flashKey} className="flash" />}
            {hint && <div className="stage-hint">{hint}</div>}
          </div>

          {!ready && (
            <div className="stage-message">
              {error ? (
                <>
                  <b>😢 카메라를 켤 수 없어요</b>
                  <p>{error}</p>
                  <button type="button" className="btn primary" onClick={retry}>
                    다시 시도
                  </button>
                </>
              ) : (
                <>
                  <span className="spinner" />
                  <p>카메라를 연결하는 중이에요…</p>
                </>
              )}
            </div>
          )}
        </div>

        <div className="shot-strip" style={aspectStyle}>
          {Array.from({ length: maxShots }, (_, i) => {
            const shot = shots[i]
            const current = running && i === shots.length
            return (
              <div key={i} className={`shot-cell${shot ? ' filled' : ''}${current ? ' current' : ''}`}>
                {shot ? <img src={shot.thumb} alt={`${i + 1}번째 사진`} style={photoStyle(settings)} /> : i + 1}
              </div>
            )
          })}
        </div>

        <div className="shoot-actions">
          <button type="button" className="btn ghost" onClick={onReset} disabled={running || !shots.length}>
            ↺ 다시 찍기
          </button>
          <button
            type="button"
            className={`shutter${running ? ' stop' : ''}`}
            onClick={() => void toggleShooting()}
            disabled={!running && (!ready || done)}
          >
            {shutterLabel}
          </button>
          <button type="button" className="btn primary" onClick={onNext} disabled={running || shots.length < need}>
            사진 고르기 →
          </button>
        </div>
      </section>

      <aside className="panel">
        <div className="counter">
          <div>
            <b>{shots.length}</b> / {maxShots}장
          </div>
          <div className="progress">
            <span style={{ width: `${(shots.length / maxShots) * 100}%` }} />
          </div>
        </div>
        <Field label="타이머">
          <Segmented value={settings.timer} options={TIMER_OPTIONS} onChange={(timer) => onChange({ timer })} />
        </Field>
        <Field label="촬영 방식">
          <Segmented
            value={settings.autoShoot}
            options={MODE_OPTIONS}
            onChange={(autoShoot) => onChange({ autoShoot })}
          />
        </Field>
        <Toggle label="🪞 거울 모드" checked={settings.mirror} onChange={(mirror) => onChange({ mirror })} />
        <Toggle label="🔔 효과음" checked={settings.sound} onChange={(sound) => onChange({ sound })} />
        <Field label="필터 (실시간 미리보기)">
          <div className="chips">
            {FILTERS.map((filter) => (
              <button
                key={filter.id}
                type="button"
                className={`chip${filter.id === settings.filterId ? ' active' : ''}`}
                onClick={() => onChange({ filterId: filter.id })}
              >
                {filter.name}
              </button>
            ))}
          </div>
        </Field>
        {devices.length > 0 && (
          <Field label="카메라">
            <select
              className="select-input"
              value={settings.deviceId || activeDeviceId}
              onChange={(e) => onChange({ deviceId: e.target.value })}
            >
              {devices.map((device, i) => (
                <option key={device.deviceId || i} value={device.deviceId}>
                  {device.label || `카메라 ${i + 1}`}
                </option>
              ))}
            </select>
          </Field>
        )}
        <p className="tip">
          💡 <kbd>Space</kbd> 키로도 촬영을 시작·중지할 수 있어요. 거울 모드를 켜면 결과 사진도 거울처럼 좌우가
          바뀌어요. 필터와 보정은 꾸미기 단계에서 다시 바꿀 수 있어요.
        </p>
      </aside>
    </div>
  )
}
