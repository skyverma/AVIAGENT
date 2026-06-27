import { useEffect, useState } from 'react'

export function useElapsedTimer(active: boolean, tickMs = 100): number {
  const [elapsedMs, setElapsedMs] = useState(0)
  useEffect(() => {
    if (!active) { setElapsedMs(0); return }
    const started = performance.now()
    const id = window.setInterval(() => setElapsedMs(performance.now() - started), tickMs)
    return () => window.clearInterval(id)
  }, [active, tickMs])
  return elapsedMs
}
