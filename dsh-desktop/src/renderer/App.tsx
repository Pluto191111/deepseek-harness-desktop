import { useEffect, useState, type JSX } from 'react'
import type { EngineStatus } from '../main/shared.js'

const initialStatus: EngineStatus = { kind: 'starting' }

export function App(): JSX.Element {
  const [status, setStatus] = useState<EngineStatus>(initialStatus)

  useEffect(() => {
    const desktop = window.desktop
    if (desktop === undefined) {
      setStatus({
        kind: 'error',
        message: 'The desktop bridge did not load. Close the app, run npm run build, and start it again.',
      })
      return
    }
    void desktop.getStatus().then(setStatus)
    return desktop.onEngineStatus(setStatus)
  }, [])

  if (status.kind === 'ready') {
    return (
      <main className="engine-frame">
        <iframe title="DeepSeek Harness" src={status.url} allow="clipboard-read; clipboard-write" />
      </main>
    )
  }

  const failed = status.kind === 'error'
  return (
    <main className="startup-screen">
      <section className="startup-card" aria-live="polite">
        <p className="eyebrow">Deepsee HARNESS</p>
        <h1>{failed ? '无法启动本地引擎' : '正在启动本地引擎'}</h1>
        <p>{failed ? status.message : 'DeepSeek Harness 正在准备本地 Web 工作区。'}</p>
        {failed && <button type="button" onClick={() => void window.desktop.restartEngine()}>重试</button>}
      </section>
    </main>
  )
}
