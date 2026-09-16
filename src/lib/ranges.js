// ---------------------------------------------------------------------------
// Summary ranges — "which slice of history am I looking at?"
//
// The log is keyed by local-midnight `dayKey`, so a range is nothing more than
// an ordered list of day keys. Newest first, because that's the order the
// summary reads in and the order people actually care about.
// ---------------------------------------------------------------------------

import { dayKey } from './time'

/** The default window: today plus yesterday — "the last couple of days". */
export const DEFAULT_RANGE = '2d'

/**
 * The three windows the summary can look through.
 *  - `2d`    today + yesterday
 *  - `7d`    a rolling week, today included
 *  - `month` the current calendar month, 1st → today
 */
export const RANGE_OPTIONS = [
  { key: '2d', chip: '2 days', title: 'Last 2 days', clear: 'Clear 2 days' },
  { key: '7d', chip: 'Week', title: 'This week', clear: 'Clear week' },
  { key: 'month', chip: 'Month', title: 'This month', clear: 'Clear month' },
]

export const isRangeKey = (key) => RANGE_OPTIONS.some((o) => o.key === key)

export const rangeOption = (key) =>
  RANGE_OPTIONS.find((o) => o.key === key) || RANGE_OPTIONS[0]

/** Every day key covered by `rangeKey`, newest first. */
export function rangeDayKeys(rangeKey, now = new Date()) {
  if (rangeKey === 'month') {
    const y = now.getFullYear()
    const m = now.getMonth()
    const keys = []
    for (let d = now.getDate(); d >= 1; d -= 1) keys.push(dayKey(new Date(y, m, d)))
    return keys
  }

  const span = rangeKey === '7d' ? 7 : 2
  const keys = []
  for (let i = 0; i < span; i += 1) {
    keys.push(dayKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() - i)))
  }
  return keys
}

const rollUpDay = (day) => {
  const focusSessions = day?.focusSessions || []
  const breaks = day?.breaks || []
  const tasks = day?.plan?.tasks || []
  return {
    focusCount: focusSessions.length,
    breakCount: breaks.length,
    // Laps are banked at their full length, so `lapMs` — not wall-clock
    // elapsed — is what the totals have always counted. Keep it that way.
    focusMs: focusSessions.reduce((sum, s) => sum + (s.lapMs || 0), 0),
    breakSec: breaks.reduce((sum, b) => sum + (b.actualSec || 0), 0),
    breaks,
    tasks,
    tasksTotal: tasks.length,
    tasksDone: tasks.filter((t) => t.done >= t.target).length,
    // Focus time that landed on a task, which is a subset of `focusMs` — laps
    // taken with nothing marked "now" belong to the tally but to no task.
    planFocusMs: tasks.reduce((sum, t) => sum + (t.focusMs || 0), 0),
  }
}

/** Roll every day in the range up into one set of totals. */
export function summarizeRange(days, rangeKey, now = new Date()) {
  const keys = rangeDayKeys(rangeKey, now)
  const totals = {
    focusCount: 0,
    breakCount: 0,
    totalFocusMs: 0,
    totalBreakSec: 0,
    tasksTotal: 0,
    tasksDone: 0,
    planFocusMs: 0,
  }
  const perDay = []
  const breaks = []
  const planTasks = []
  let focusDays = 0

  for (const key of keys) {
    const d = rollUpDay(days[key])
    totals.focusCount += d.focusCount
    totals.breakCount += d.breakCount
    totals.totalFocusMs += d.focusMs
    totals.totalBreakSec += d.breakSec
    totals.tasksTotal += d.tasksTotal
    totals.tasksDone += d.tasksDone
    totals.planFocusMs += d.planFocusMs
    if (d.focusCount) focusDays += 1
    if (d.breaks.length) breaks.push(...d.breaks)
    // Newest first, matching `keys`, so the summary lists the latest plan on top.
    for (const task of d.tasks) planTasks.push({ ...task, day: key })

    // Days with nothing on them are dropped here; callers that want the blank
    // days back can rebuild them from `keys`. A day where you planned but
    // never started the timer is *not* nothing — that's the day worth seeing.
    if (d.focusCount || d.breakCount || d.tasksTotal) {
      perDay.push({
        key,
        focusCount: d.focusCount,
        breakCount: d.breakCount,
        focusMs: d.focusMs,
        breakSec: d.breakSec,
        tasksTotal: d.tasksTotal,
        tasksDone: d.tasksDone,
      })
    }
  }

  return {
    ...totals,
    keys,
    perDay,
    planTasks,
    breaks: breaks.slice().sort((a, b) => (b.startedAt || 0) - (a.startedAt || 0)),
    longestBreakSec: breaks.reduce((max, b) => Math.max(max, b.actualSec || 0), 0),
    // Days that actually banked a lap — the sentence this feeds is about laps,
    // so a plan-only day mustn't inflate it.
    activeDays: focusDays,
  }
}

/** "Today" / "Yesterday" / "Fri, Sep 11" */
export function dayLabel(key, todayKey) {
  if (key === todayKey) return 'Today'
  const [y, m, d] = key.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  const [ty, tm, td] = todayKey.split('-').map(Number)
  const today = new Date(ty, tm - 1, td)
  const diff = Math.round((today - date) / 86400000)
  if (diff === 1) return 'Yesterday'
  return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
}

const shortDate = (key) => {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })
}

/** "Sep 7 – Sep 13", or a single date when the range is only one day long. */
export function rangeSpanLabel(keys) {
  if (!keys.length) return ''
  const newest = shortDate(keys[0])
  const oldest = shortDate(keys[keys.length - 1])
  return newest === oldest ? newest : `${oldest} – ${newest}`
}
