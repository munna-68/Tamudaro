import { useEffect, useRef, useState } from 'react'
import { TICK_MS } from '../lib/time'

/**
 * A requestAnimationFrame clock that only re-renders when it actually needs
 * to (every `intervalMs`). We derive elapsed time from wall-clock timestamps
 * rather than accumulating frames, so the timer stays accurate even if the
 * browser throttles rAF in a background tab.
 *
 * Returns the latest timestamp. When `active` is false the loop parks and the
 * value freezes — callers that need "now" while idle shouldn't use this.
 */
export function useRafTick(active, intervalMs = TICK_MS) {
  const [now, setNow] = useState(() => Date.now())
  const lastEmit = useRef(0)

  useEffect(() => {
    if (!active) return undefined

    // Emit immediately so resuming feels instant rather than 50ms late.
    lastEmit.current = 0
    let raf = 0
    const loop = () => {
      const t = Date.now()
      if (t - lastEmit.current >= intervalMs) {
        lastEmit.current = t
        setNow(t)
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [active, intervalMs])

  return now
}

/**
 * Re-renders at a fixed cadence regardless of timers. Used for the midnight
 * rollover check and for "x min ago" style copy that goes stale on its own.
 */
export function useInterval(callback, delayMs) {
  const saved = useRef(callback)
  useEffect(() => {
    saved.current = callback
  }, [callback])

  useEffect(() => {
    if (delayMs == null) return undefined
    const id = window.setInterval(() => saved.current(), delayMs)
    return () => window.clearInterval(id)
  }, [delayMs])
}
