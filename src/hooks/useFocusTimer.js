import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { LAP_MS, dayKey } from '../lib/time'
import { FOCUS_RUN_KEY, readJSON, writeJSON, removeKey } from '../lib/storage'
import { useRafTick } from './useRafTick'

/**
 * The focus stopwatch.
 *
 * Design contract (from the brief):
 *   - It counts UP from 0:00 and it never stops at a lap boundary.
 *   - The ring laps every 25 minutes: each completed lap banks one focus
 *     session, the ring resets to empty, and the clock keeps running.
 *   - Pause is a user choice, not something the app does on its own.
 *
 * The run is persisted as {accumulatedMs, startedAt} rather than a live
 * elapsed value, so a page reload (or a phone locking) resumes the stopwatch
 * from real elapsed wall-clock time instead of losing progress.
 */
export function useFocusTimer({ onLapComplete }) {
  const [run, setRun] = useState(() => {
    const saved = readJSON(FOCUS_RUN_KEY, null)
    const today = dayKey()
    if (
      saved &&
      typeof saved === 'object' &&
      typeof saved.accumulatedMs === 'number' &&
      typeof saved.lastLap === 'number'
    ) {
      // A run started yesterday can't keep counting into today's tally.
      if (saved.dayKey === today) return saved
      return {
        dayKey: today,
        running: false,
        accumulatedMs: 0,
        startedAt: null,
        lastLap: 0,
      }
    }
    return { dayKey: today, running: false, accumulatedMs: 0, startedAt: null, lastLap: 0 }
  })

  const now = useRafTick(run.running)

  const elapsedMs = useMemo(() => {
    if (run.running && run.startedAt) {
      return run.accumulatedMs + Math.max(0, now - run.startedAt)
    }
    return run.accumulatedMs
  }, [run.running, run.startedAt, run.accumulatedMs, now])

  // Keep the callback in a ref so the lap effect never re-fires just because
  // the parent handed us a new closure.
  const lapHandler = useRef(onLapComplete)
  useEffect(() => {
    lapHandler.current = onLapComplete
  }, [onLapComplete])

  const lapIndex = Math.floor(elapsedMs / LAP_MS)

  // Bank every lap we just crossed. Usually exactly one, but a throttled or
  // long-suspended tab can cross several at once — we honour all of them so
  // the tally stays honest.
  useEffect(() => {
    if (lapIndex > run.lastLap) {
      const firstNew = run.lastLap + 1
      const count = lapIndex - run.lastLap
      for (let i = 0; i < count; i += 1) {
        const lapNumber = firstNew + i
        lapHandler.current?.({
          lapNumber,
          at: Date.now(),
          // The exact stopwatch reading at that lap boundary.
          elapsedMsAtLap: lapNumber * LAP_MS,
        })
      }
      setRun((prev) => ({ ...prev, lastLap: lapIndex }))
    }
  }, [lapIndex, run.lastLap])

  // Persist the run skeleton (not the ticking value).
  useEffect(() => {
    writeJSON(FOCUS_RUN_KEY, run)
  }, [run])

  const start = useCallback(() => {
    setRun((prev) =>
      prev.running ? prev : { ...prev, running: true, startedAt: Date.now() },
    )
  }, [])

  const pause = useCallback(() => {
    setRun((prev) => {
      if (!prev.running) return prev
      const extra = prev.startedAt ? Math.max(0, Date.now() - prev.startedAt) : 0
      return {
        ...prev,
        running: false,
        startedAt: null,
        accumulatedMs: prev.accumulatedMs + extra,
      }
    })
  }, [])

  const toggle = useCallback(() => {
    setRun((prev) => {
      if (prev.running) {
        const extra = prev.startedAt ? Math.max(0, Date.now() - prev.startedAt) : 0
        return {
          ...prev,
          running: false,
          startedAt: null,
          accumulatedMs: prev.accumulatedMs + extra,
        }
      }
      return { ...prev, running: true, startedAt: Date.now() }
    })
  }, [])

  /** Full stop: back to a cold 0:00 stopwatch. */
  const reset = useCallback(() => {
    removeKey(FOCUS_RUN_KEY)
    setRun({
      dayKey: dayKey(),
      running: false,
      accumulatedMs: 0,
      startedAt: null,
      lastLap: 0,
    })
  }, [])

  /**
   * Called when the clock crosses local midnight. The stopwatch itself keeps
   * running — we just move the lap baseline so yesterday's laps aren't
   * re-banked into the new day.
   */
  const rolloverDay = useCallback(() => {
    setRun((prev) => {
      if (prev.dayKey === dayKey()) return prev
      const currentElapsed = prev.running && prev.startedAt
        ? prev.accumulatedMs + Math.max(0, Date.now() - prev.startedAt)
        : prev.accumulatedMs
      return {
        ...prev,
        dayKey: dayKey(),
        lastLap: Math.floor(currentElapsed / LAP_MS),
      }
    })
  }, [])

  const lapProgress = Math.min(1, (elapsedMs % LAP_MS) / LAP_MS)

  return {
    elapsedMs,
    lapProgress,
    lapIndex,
    lapsCompleted: lapIndex,
    running: run.running,
    hasStarted: run.accumulatedMs > 0 || run.running,
    start,
    pause,
    toggle,
    reset,
    rolloverDay,
  }
}
