// 효과음은 파일 없이 Web Audio 로 직접 만든다

let audio: AudioContext | null = null

function getAudio(): AudioContext | null {
  try {
    audio ??= new AudioContext()
    if (audio.state === 'suspended') void audio.resume()
    return audio
  } catch {
    return null
  }
}

export function playBeep(frequency: number) {
  const ac = getAudio()
  if (!ac) return
  const now = ac.currentTime
  const osc = ac.createOscillator()
  const gain = ac.createGain()
  osc.type = 'sine'
  osc.frequency.value = frequency
  gain.gain.setValueAtTime(0.0001, now)
  gain.gain.exponentialRampToValueAtTime(0.3, now + 0.01)
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.15)
  osc.connect(gain).connect(ac.destination)
  osc.start(now)
  osc.stop(now + 0.17)
}

export function playShutter() {
  const ac = getAudio()
  if (!ac) return
  const length = Math.floor(ac.sampleRate * 0.18)
  const buffer = ac.createBuffer(1, length, ac.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < length; i++) {
    const t = i / length
    // '찰-칵' 두 번의 짧은 잡음
    const envelope = t < 0.35 ? Math.pow(1 - t / 0.35, 3) : 0.7 * Math.pow(1 - (t - 0.35) / 0.65, 4)
    data[i] = (Math.random() * 2 - 1) * envelope
  }
  const source = ac.createBufferSource()
  source.buffer = buffer
  const gain = ac.createGain()
  gain.gain.value = 0.45
  source.connect(gain).connect(ac.destination)
  source.start()
}
