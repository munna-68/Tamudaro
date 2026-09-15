import { useCallback, useEffect, useMemo, useState } from 'react'
import { dayKey, msUntilNextMidnight } from '../lib/time'
import { emptyDay, loadLog, saveLog } from '../lib/storage'
import { DEFAULT_RANGE, isRangeKey, summarizeRange } from '../lib/ranges'
import { useInterval } from './useRafTick'

const uid = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`

/**
 * Today's log. Everything the app records — focus laps and breaks — lands in
 * `days[dayKey]`, keyed by the device's local calendar date. Crossing local
 * midnight rolls the app onto a fresh, empty day; yesterday's entries are kept
 * on disk (ready for a history view later) but stop showing in the summary.
 */
export function useTodayLog() {
  const [log, setLog] = useState(() => loadLog())
  const [today, setToday] = useState(() => dayKey())
  // Which window the summary is looking through. Remembered across sessions so
  // the app reopens on the view you left it on.
  const [range, setRangeState] = useState(() =>
    isRangeKey(log?.settings?.range) ? log.settings.range : DEFAULT_RANGE,
  )

  useEffect(() => {
    saveLog(log)
  }, [log])

  // A coarse heartbeat so a session left open overnight rolls over on its own,
  // plus an exact alarm pinned to the next local midnight.
  useInterval(() => setToday(dayKey()), 20000)

  useEffect(() => {
    let timer = 0
    const schedule = () => {
      timer = window.setTimeout(() => {
        setToday(dayKey())
        schedule()
      }, msUntilNextMidnight() + 250)
    }
    schedule()
    return () => window.clearTimeout(timer)
  }, [today])

  // Returning from a locked screen or a background tab is the most likely
  // moment to have silently crossed midnight.
  useEffect(() => {
    const onWake = () => setToday(dayKey())
    document.addEventListener('visibilitychange', onWake)
    window.addEventListener('focus', onWake)
    return () => {
      document.removeEventListener('visibilitychange', onWake)
      window.removeEventListener('focus', onWake)
    }
  }, [])

  const day = useMemo(() => log.days[today] || emptyDay(), [log, today])

  const addFocusSession = useCallback(
    ({ lapNumber, endedAt, lapMs, focusMsAtLapEnd }) => {
      const key = dayKey(new Date(endedAt))
      setLog((prev) => {
        const existing = prev.days[key] || emptyDay()
        const entry = {
          id: uid(),
          endedAt,
          lapNumber,
          lapMs,
          focusMsAtLapEnd,
        }
        return {
          ...prev,
          days: {
            ...prev.days,
            [key]: { ...existing, focusSessions: [...existing.focusSessions, entry] },
          },
        }
      })
    },
    [],
  )

  const addBreak = useCallback(
    ({ reason, plannedSec, actualSec, startedAt, endedAt, endedEarly }) => {
      const key = dayKey(new Date(startedAt))
      setLog((prev) => {
        const existing = prev.days[key] || emptyDay()
        if (existing.breaks.some((b) => b.startedAt === startedAt)) return prev
        const entry = {
          id: uid(),
          reason,
          plannedSec,
          actualSec,
          startedAt,
          endedAt,
          endedEarly: Boolean(endedEarly),
        }
        return {
          ...prev,
          days: {
            ...prev.days,
            [key]: { ...existing, breaks: [...existing.breaks, entry] },
          },
        }
      })
    },
    [],
  )

  const setSoundOn = useCallback((soundOn) => {
    setLog((prev) => ({ ...prev, settings: { ...prev.settings, soundOn } }))
  }, [])

  /** Wipe today only — yesterday survives. */
  const clearToday = useCallback(() => {
    const key = dayKey()
    setLog((prev) => ({
      ...prev,
      days: { ...prev.days, [key]: emptyDay() },
    }))
  }, [])

  /** Wipe an explicit set of days — backs the summary's range clear. */
  const clearDays = useCallback((keys) => {
    if (!keys || keys.length === 0) return
    setLog((prev) => {
      const days = { ...prev.days }
      for (const key of keys) days[key] = emptyDay()
      return { ...prev, days }
    })
  }, [])

  const setRange = useCallback((next) => {
    if (!isRangeKey(next)) return
    setRangeState(next)
    setLog((prev) => ({ ...prev, settings: { ...prev.settings, range: next } }))
  }, [])

  const stats = useMemo(() => {
    const focusSessions = day.focusSessions
    const breaks = day.breaks
    const totalFocusMs = focusSessions.reduce((sum, s) => sum + (s.lapMs || 0), 0)
    const totalBreakSec = breaks.reduce((sum, b) => sum + (b.actualSec || 0), 0)
    // Longest unbroken run of focus laps in a row (laps are contiguous by
    // nature, so this is just the count — kept explicit for future use).
    return {
      focusCount: focusSessions.length,
      breakCount: breaks.length,
      totalFocusMs,
      totalBreakSec,
      lastFocusAt: focusSessions.length
        ? focusSessions[focusSessions.length - 1].endedAt
        : null,
    }
  }, [day])

  // Totals for the window the summary is showing — today, the last couple of
  // days, the week, or the month. `today` is in the deps purely so the window
  // slides forward when the clock rolls past local midnight.
  const rangeStats = useMemo(
    () => summarizeRange(log.days, range),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [log.days, range, today],
  )

  return {
    today,
    day,
    stats,
    range,
    setRange,
    rangeStats,
    settings: log.settings,
    setSoundOn,
    addFocusSession,
    addBreak,
    clearToday,
    clearDays,
  }
}
