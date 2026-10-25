import { useEffect, useRef, useState } from 'react'

interface CameraStatus {
  key: string
  ready: boolean
  error: string | null
  activeDeviceId: string
}

function describeError(err: unknown): string {
  const name = err instanceof DOMException ? err.name : ''
  switch (name) {
    case 'NotAllowedError':
    case 'SecurityError':
      return '카메라 권한이 막혀 있어요. 주소창 왼쪽의 카메라(자물쇠) 아이콘을 눌러 권한을 허용한 뒤 다시 시도해 주세요.'
    case 'NotFoundError':
    case 'OverconstrainedError':
      return '연결된 카메라를 찾지 못했어요. 웹캠이 제대로 연결되어 있는지 확인해 주세요.'
    case 'NotReadableError':
    case 'AbortError':
      return '다른 프로그램(줌, 팀즈, 카메라 앱 등)이 카메라를 쓰고 있어요. 그 프로그램을 종료하고 다시 시도해 주세요.'
    default:
      return '카메라를 켤 수 없어요. 연결 상태와 권한을 확인해 주세요.'
  }
}

/** 카메라 스트림을 열고, 화면을 벗어나면 자동으로 끈다 */
export function useCamera(deviceId: string) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [attempt, setAttempt] = useState(0)
  const [status, setStatus] = useState<CameraStatus>({ key: '', ready: false, error: null, activeDeviceId: '' })
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([])
  const supported = typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia
  const key = `${deviceId}#${attempt}`

  useEffect(() => {
    if (!supported) return
    let cancelled = false
    let stream: MediaStream | null = null

    navigator.mediaDevices
      .getUserMedia({
        audio: false,
        video: {
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          ...(deviceId ? { deviceId: { ideal: deviceId } } : {}),
        },
      })
      .then(async (opened) => {
        stream = opened
        if (cancelled) {
          opened.getTracks().forEach((track) => track.stop())
          return
        }
        const video = videoRef.current
        if (video) {
          video.srcObject = opened
          await video.play().catch(() => undefined)
        }
        // 권한을 받은 뒤에야 카메라 이름을 알 수 있다
        const list = (await navigator.mediaDevices.enumerateDevices()).filter((d) => d.kind === 'videoinput')
        if (cancelled) return
        setDevices(list)
        setStatus({
          key,
          ready: true,
          error: null,
          activeDeviceId: opened.getVideoTracks()[0]?.getSettings().deviceId ?? '',
        })
      })
      .catch((err: unknown) => {
        if (!cancelled) setStatus({ key, ready: false, error: describeError(err), activeDeviceId: '' })
      })

    return () => {
      cancelled = true
      stream?.getTracks().forEach((track) => track.stop())
    }
  }, [deviceId, key, supported])

  const current = status.key === key ? status : null
  return {
    videoRef,
    devices,
    ready: current?.ready ?? false,
    error: supported
      ? (current?.error ?? null)
      : '이 브라우저에서는 카메라를 쓸 수 없어요. Chrome 이나 Edge 최신 버전으로 열어 주세요.',
    activeDeviceId: current?.activeDeviceId ?? '',
    retry: () => setAttempt((n) => n + 1),
  }
}
