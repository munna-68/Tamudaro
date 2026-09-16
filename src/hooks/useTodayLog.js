import { useCallback, useEffect, useMemo, useState } from 'react'
import { dayKey, msUntilNextMidnight } from '../lib/time'
import { emptyDay, loadLog, saveLog } from '../lib/storage'
import { DEFAULT_RANGE, isRangeKey, summarizeRange } from '../lib/ranges'
import {
  applyTaskPatch,
  emptyPlan,
  isTaskDone,
  makeTask,
  planStats,
  toggleTaskDone,
  withDone,
} from '../lib/plan'
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

  // --- today's plan -------------------------------------------------------
  /**
   * Every plan edit funnels through here: read today's plan, hand it to a pure
   * mutator, write the result back. Without it each of the eight actions below
   * would re-implement the same immutable dance and one of them would get it
   * subtly wrong.
   *
   * The plan is always written to *today*, never to the day a sheet happened to
   * be opened on — you plan the day you're in.
   */
  const updatePlan = useCallback((mutate) => {
    const key = dayKey()
    setLog((prev) => {
      const existing = prev.days[key] || emptyDay()
      return {
        ...prev,
        days: {
          ...prev.days,
          [key]: { ...existing, plan: mutate(existing.plan || emptyPlan()) },
        },
      }
    })
  }, [])

  /** Tasks are completed, not removed — clearing the active flag is enough. */
  const patchTasks = (plan, id, fn) => ({
    ...plan,
    tasks: plan.tasks.map((task) => (task.id === id ? fn(task) : task)),
  })

  const addTask = useCallback(
    ({ title, target = 1, unit = 'none' }) => {
      const clean = String(title ?? '').trim()
      if (!clean) return null
      const id = uid()
      updatePlan((plan) => ({
        ...plan,
        tasks: [...plan.tasks, makeTask({ id, title: clean, target, unit })],
      }))
      return id
    },
    [updatePlan],
  )

  const updateTask = useCallback(
    (id, patch) => updatePlan((plan) => patchTasks(plan, id, (task) => applyTaskPatch(task, patch))),
    [updatePlan],
  )

  const nudgeTask = useCallback(
    (id, delta) =>
      updatePlan((plan) =>
        patchTasks(plan, id, (task) => withDone(task, task.done + delta)),
      ),
    [updatePlan],
  )

  const toggleTask = useCallback(
    (id) => updatePlan((plan) => patchTasks(plan, id, (task) => toggleTaskDone(task))),
    [updatePlan],
  )

  const removeTask = useCallback(
    (id) =>
      updatePlan((plan) => ({
        tasks: plan.tasks.filter((task) => task.id !== id),
        activeId: plan.activeId === id ? null : plan.activeId,
      })),
    [updatePlan],
  )

  /** Mark a task as the one the stopwatch is feeding. Tapping it again stops. */
  const setActiveTask = useCallback(
    (id) => updatePlan((plan) => ({ ...plan, activeId: plan.activeId === id ? null : id })),
    [updatePlan],
  )

  const moveTask = useCallback(
    (id, delta) =>
      updatePlan((plan) => {
        const from = plan.tasks.findIndex((task) => task.id === id)
        const to = from + delta
        if (from < 0 || to < 0 || to >= plan.tasks.length) return plan
        const tasks = plan.tasks.slice()
        ;[tasks[from], tasks[to]] = [tasks[to], tasks[from]]
        return { ...plan, tasks }
      }),
    [updatePlan],
  )

  /** Clear the ticked ones off the list so the rest has room to breathe. */
  const clearDoneTasks = useCallback(
    () =>
      updatePlan((plan) => ({
        tasks: plan.tasks.filter((task) => !isTaskDone(task)),
        activeId: plan.activeId,
      })),
    [updatePlan],
  )

  /**
   * A finished focus lap lands on whatever task is marked "now". Laps are
   * banked at their full length everywhere else in the app, so they're banked
   * at their full length here too — the number on the task is the same number
   * the stats row counted.
   */
  const bankTaskFocus = useCallback(
    (ms) => {
      if (!(ms > 0)) return
      updatePlan((plan) => {
        if (!plan.activeId) return plan
        return patchTasks(plan, plan.activeId, (task) => ({
          ...task,
          focusMs: (task.focusMs || 0) + ms,
        }))
      })
    },
    [updatePlan],
  )

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

  const plan = day.plan || emptyPlan()

  const todayPlan = useMemo(() => planStats(plan), [plan])

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
    plan,
    planStats: todayPlan,
    range,
    setRange,
    rangeStats,
    settings: log.settings,
    setSoundOn,
    addFocusSession,
    addBreak,
    clearToday,
    clearDays,
    addTask,
    updateTask,
    nudgeTask,
    toggleTask,
    removeTask,
    setActiveTask,
    moveTask,
    clearDoneTasks,
    bankTaskFocus,
  }
}
