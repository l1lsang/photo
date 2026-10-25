import { useEffect, useMemo, useState } from 'react'
import './App.css'
import type { Settings, Shot } from './types'
import EditScreen from './components/EditScreen'
import HomeScreen from './components/HomeScreen'
import SelectScreen from './components/SelectScreen'
import ShootScreen from './components/ShootScreen'
import { getLayout } from './lib/layouts'
import { loadSettings, saveSettings } from './lib/settings'

type Step = 'home' | 'shoot' | 'select' | 'edit'

const MAX_SHOTS = 10

const STEPS = [
  { id: 'shoot', label: '촬영' },
  { id: 'select', label: '사진 고르기' },
  { id: 'edit', label: '꾸미기 · 저장' },
] as const

function toggleFullscreen() {
  if (document.fullscreenElement) void document.exitFullscreen()
  else void document.documentElement.requestFullscreen().catch(() => undefined)
}

export default function App() {
  const [step, setStep] = useState<Step>('home')
  const [settings, setSettings] = useState<Settings>(loadSettings)
  const [shots, setShots] = useState<Shot[]>([])
  const [selected, setSelected] = useState<number[]>([])
  const [toast, setToast] = useState<{ id: number; text: string } | null>(null)

  useEffect(() => saveSettings(settings), [settings])

  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(null), 2600)
    return () => clearTimeout(timer)
  }, [toast])

  const need = getLayout(settings.layoutId).slots.length
  const date = useMemo(() => (shots.length ? new Date(shots[0].takenAt) : undefined), [shots])
  const chosen = useMemo(() => selected.map((i) => shots[i]).filter(Boolean), [selected, shots])
  const reachable: Record<Step, boolean> = {
    home: true,
    shoot: true,
    select: shots.length >= need,
    edit: chosen.length === need,
  }

  const update = (patch: Partial<Settings>) => setSettings((prev) => ({ ...prev, ...patch }))
  const notify = (text: string) => setToast((prev) => ({ id: (prev?.id ?? 0) + 1, text }))

  function clearShots() {
    setShots([])
    setSelected([])
  }

  function retake() {
    if (confirm('찍은 사진을 모두 지우고 처음부터 다시 찍을까요?')) clearShots()
  }

  function goHome() {
    if (shots.length && !confirm('찍은 사진이 모두 사라져요. 처음 화면으로 갈까요?')) return
    clearShots()
    setStep('home')
  }

  return (
    <div className="app">
      <header className="topbar">
        <button type="button" className="brand" onClick={goHome}>
          <span className="brand-mark">📸</span>
          네컷 <em>스튜디오</em>
        </button>
        {step === 'home' ? (
          <span />
        ) : (
          <nav className="stepper">
            {STEPS.map((s, i) => (
              <button
                key={s.id}
                type="button"
                className={step === s.id ? 'active' : ''}
                disabled={!reachable[s.id]}
                onClick={() => setStep(s.id)}
              >
                <i>{i + 1}</i>
                <span>{s.label}</span>
              </button>
            ))}
          </nav>
        )}
        <button type="button" className="icon-btn" onClick={toggleFullscreen} title="전체 화면 (F11)">
          ⛶ 전체 화면
        </button>
      </header>

      <main className="main">
        {step === 'home' && <HomeScreen onStart={() => setStep('shoot')} />}
        {step === 'shoot' && (
          <ShootScreen
            settings={settings}
            onChange={update}
            shots={shots}
            maxShots={MAX_SHOTS}
            onCapture={(shot) => setShots((prev) => [...prev, shot])}
            onReset={retake}
            onNext={() => setStep('select')}
          />
        )}
        {step === 'select' && (
          <SelectScreen
            shots={shots}
            selected={selected}
            onSelect={setSelected}
            settings={settings}
            date={date}
            onBack={() => setStep('shoot')}
            onNext={() => setStep('edit')}
            notify={notify}
          />
        )}
        {step === 'edit' && (
          <EditScreen
            shots={chosen}
            settings={settings}
            onChange={update}
            date={date}
            onBack={() => setStep('select')}
            onHome={goHome}
            notify={notify}
          />
        )}
      </main>

      {toast && (
        <div key={toast.id} className="toast" role="status">
          {toast.text}
        </div>
      )}
    </div>
  )
}
