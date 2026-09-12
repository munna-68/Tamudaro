import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { dayKey } from '../lib/time'
import { BREAK_RUN_KEY, readJSON, writeJSON, removeKey } from '../lib/storage'
import { useRafTick } from './useRafTick'

/**
 * The break countdown.
 *
 * A break is an explicit, bounded thing: you state why you're stepping away
 * and for how long. It counts DOWN to zero. It can also be ended early — and
 * when that happens we log the break honestly, recording both what you asked
 * for and what you actually took.
 *
 * Persisted as an absolute `endsAt` timestamp, so a reload mid-break keeps the
 * real remaining time instead of restarting the clock.
 */
export function useBreakTimer({ onComplete }) {
  const [run, setRun] = useState(() => {
    const saved = readJSON(BREAK_RUN_KEY, null)
    const today = dayKey()
    if (saved && typeof saved === 'object' && saved.active && saved.endsAt) {
      // A break that spilled over midnight still belongs to the day it began.
      if (saved.dayKey === today) return saved
      return null
    }
    return null
  })

  const now = useRafTick(Boolean(run && run.active))

  const remainingMs = useMemo(() => {
    if (!run || !run.active) return 0
    return Math.max(0, run.endsAt - now)
  }, [run, now])

  const totalMs = run ? run.plannedSec * 1000 : 0
  const elapsedMs = run ? Math.max(0, Math.min(totalMs, totalMs - remainingMs)) : 0
  const progress = totalMs > 0 ? remainingMs / totalMs : 0

  const completeHandler = useRef(onComplete)
  useEffect(() => {
    completeHandler.current = onComplete
  }, [onComplete])

  const finishedRef = useRef(false)

  // Natural completion.
  useEffect(() => {
    if (!run || !run.active) {
      finishedRef.current = false
      return
    }
    if (remainingMs <= 0 && !finishedRef.current) {
      finishedRef.current = true
      const finished = run
      setRun(null)
      removeKey(BREAK_RUN_KEY)
      completeHandler.current?.({ run: finished, endedEarly: false, actualSec: finished.plannedSec })
    }
  }, [run, remainingMs])

  useEffect(() => {
    if (run) writeJSON(BREAK_RUN_KEY, run)
  }, [run])

  /** Begin a break. `minutes` may be fractional-free; UI passes whole minutes. */
  const start = useCallback(({ reason, minutes }) => {
    const plannedSec = Math.max(1, Math.round(minutes * 60))
    const startedAt = Date.now()
    finishedRef.current = false
    const next = {
      active: true,
      dayKey: dayKey(),
      reason: String(reason || '').trim(),
      plannedSec,
      startedAt,
      endsAt: startedAt + plannedSec * 1000,
    }
    setRun(next)
    return next
  }, [])

  /** Bail out early — still logged, just flagged as shortened. */
  const endEarly = useCallback(() => {
    setRun((prev) => {
      if (!prev || !prev.active) return prev
      const actualSec = Math.max(0, Math.round((Date.now() - prev.startedAt) / 1000))
      finishedRef.current = true
      removeKey(BREAK_RUN_KEY)
      // Fire after this render so we don't set state on a sibling mid-update.
      window.setTimeout(() => {
        completeHandler.current?.({ run: prev, endedEarly: true, actualSec })
      }, 0)
      return null
    })
  }, [])

  /** Abandon without logging anything (for the "oops, wrong mode" case). */
  const discard = useCallback(() => {
    finishedRef.current = true
    removeKey(BREAK_RUN_KEY)
    setRun(null)
  }, [])

  return {
    active: Boolean(run && run.active),
    run,
    reason: run ? run.reason : '',
    plannedSec: run ? run.plannedSec : 0,
    remainingMs,
    elapsedMs,
    progress,
    start,
    endEarly,
    discard,
  }
}
