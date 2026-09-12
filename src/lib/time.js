// ---------------------------------------------------------------------------
// Time helpers + the single source of truth for "what day is it?"
// ---------------------------------------------------------------------------

/** Length of one focus lap, in minutes. The ring fills over exactly this. */
export const LAP_MINUTES = 25
export const LAP_MS = LAP_MINUTES * 60 * 1000

/** Ring refresh rate. 20fps is plenty for a ring that moves this slowly. */
export const TICK_MS = 50

/**
 * Day boundary decision: everything resets at LOCAL midnight.
 *
 * We derive the key from the device's own calendar (getFullYear/getMonth/
 * getDate), never from UTC or from a fixed offset. So a session logged at
 * 23:59 belongs to today, and the very next tick past 00:00 starts a brand
 * new, empty day. Travelling across timezones simply moves the boundary with
 * the user's clock, which is the least surprising behaviour for a
 * "today's tally" feature.
 */
export function dayKey(date = new Date()) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** Milliseconds until the next local midnight. Used to schedule the rollover. */
export function msUntilNextMidnight(from = new Date()) {
  const next = new Date(from.getFullYear(), from.getMonth(), from.getDate() + 1, 0, 0, 0, 0)
  return Math.max(1000, next.getTime() - from.getTime())
}

/** 0:00 / 12:34 / 1:02:03 — hours only appear once you've earned them. */
export function formatClock(ms) {
  const total = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const ss = String(s).padStart(2, '0')
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${ss}`
  return `${m}:${ss}`
}

export function formatClockFromSeconds(sec) {
  return formatClock(sec * 1000)
}

/** "25 min" / "1h 05m" — for compact labels. */
export function formatMinutes(min) {
  const whole = Math.max(0, Math.round(min))
  if (whole < 60) return `${whole} min`
  const h = Math.floor(whole / 60)
  const m = whole % 60
  return m === 0 ? `${h}h` : `${h}h ${String(m).padStart(2, '0')}m`
}

/** "3:41 PM" — when a break was taken. */
export function formatTimeOfDay(epoch) {
  return new Date(epoch).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  })
}

/** "Sat, Sep 12" */
export function formatFriendlyDate(date = new Date()) {
  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

/** Human duration for a break that was cut short: "6 min 20 sec". */
export function formatDurationWords(seconds) {
  const s = Math.max(0, Math.round(seconds))
  const m = Math.floor(s / 60)
  const rest = s % 60
  if (m === 0) return `${rest} sec`
  if (rest === 0) return `${m} min`
  return `${m} min ${rest} sec`
}
