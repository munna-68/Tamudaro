// ---------------------------------------------------------------------------
// Tiny localStorage wrapper. No backend in v1 — the device is the database.
// Every read is defensive: a corrupt or hand-edited blob must never brick the
// app, it just falls back to a clean slate.
// ---------------------------------------------------------------------------

import { DEFAULT_RANGE, isRangeKey } from './ranges'
import { emptyPlan, normalizePlan } from './plan'

export const LOG_KEY = 'tanudaro.v1.log'
export const FOCUS_RUN_KEY = 'tanudaro.v1.focusRun'
export const BREAK_RUN_KEY = 'tanudaro.v1.breakRun'

export function readJSON(key, fallback) {
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return fallback
    const parsed = JSON.parse(raw)
    return parsed == null ? fallback : parsed
  } catch {
    return fallback
  }
}

export function writeJSON(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* private mode / quota — the app still works, it just forgets. */
  }
}

export function removeKey(key) {
  try {
    window.localStorage.removeItem(key)
  } catch {
    /* noop */
  }
}

export const emptyDay = () => ({ focusSessions: [], breaks: [], plan: emptyPlan() })

export const initialLog = () => ({
  version: 1,
  days: {},
  settings: { soundOn: true, range: DEFAULT_RANGE },
})

/** Normalise whatever we pulled off disk into a shape the app can trust. */
export function normalizeLog(raw) {
  const base = initialLog()
  if (!raw || typeof raw !== 'object') return base
  const days = {}
  if (raw.days && typeof raw.days === 'object') {
    for (const [key, value] of Object.entries(raw.days)) {
      if (!value || typeof value !== 'object') continue
      days[key] = {
        focusSessions: Array.isArray(value.focusSessions) ? value.focusSessions : [],
        breaks: Array.isArray(value.breaks) ? value.breaks : [],
        // Days written before the plan existed simply have no tasks — which is
        // exactly what an empty plan is.
        plan: normalizePlan(value.plan),
      }
    }
  }
  const storedRange = raw.settings && raw.settings.range

  return {
    version: 1,
    days,
    settings: {
      soundOn:
        raw.settings && typeof raw.settings.soundOn === 'boolean'
          ? raw.settings.soundOn
          : base.settings.soundOn,
      range: isRangeKey(storedRange) ? storedRange : base.settings.range,
    },
  }
}

export function loadLog() {
  return normalizeLog(readJSON(LOG_KEY, null))
}

export function saveLog(log) {
  writeJSON(LOG_KEY, log)
}
