// ---------------------------------------------------------------------------
// The day's plan — what you meant to cover, how far you actually got, and how
// much focus time landed on it.
//
// A task is deliberately dumb: a title, an optional target with a unit label
// ("4 pages", "3 chapters"), a counter of how much is done, and the focus
// milliseconds banked against it. A target of 1 with no unit is just a plain
// checkbox, so the "basic to-do list" case costs nothing extra.
//
// Like everything else in the log, the plan lives under a single day key and
// resets at local midnight. Yesterday's plan stays on disk for the summary.
// ---------------------------------------------------------------------------

export const MAX_TITLE = 90
export const MAX_TARGET = 999

/** Unit labels offered when you add a task. `none` means "just done". */
export const UNIT_OPTIONS = [
  { key: 'none', label: 'just done' },
  { key: 'pages', label: 'pages' },
  { key: 'chapters', label: 'chapters' },
  { key: 'problems', label: 'problems' },
]

const UNIT_KEYS = UNIT_OPTIONS.map((o) => o.key)

export const isUnitKey = (key) => UNIT_KEYS.includes(key)

export const unitLabel = (key) => UNIT_OPTIONS.find((o) => o.key === key)?.label || ''

export const clampTarget = (n) => {
  const v = Math.round(Number(n))
  if (!Number.isFinite(v)) return 1
  return Math.min(MAX_TARGET, Math.max(1, v))
}

export const clampDone = (done, target) => Math.min(target, Math.max(0, Math.round(Number(done) || 0)))

export const emptyPlan = () => ({ tasks: [], activeId: null })

export const isTaskDone = (task) => Boolean(task) && task.done >= task.target

const fallbackId = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`

/** A brand new task. `id` comes from the caller so the log owns id generation. */
export function makeTask({ id, title, target = 1, unit = 'none', createdAt = Date.now() }) {
  const clamped = clampTarget(target)
  return {
    id: id || fallbackId(),
    title: String(title ?? '').trim().slice(0, MAX_TITLE),
    unit: isUnitKey(unit) ? unit : 'none',
    target: clamped,
    done: 0,
    focusMs: 0,
    createdAt,
    doneAt: null,
  }
}

/** Whatever came off disk, made safe. Returns null for unusable rows. */
export function normalizeTask(raw) {
  if (!raw || typeof raw !== 'object') return null
  const title = String(raw.title ?? '').trim().slice(0, MAX_TITLE)
  if (!title) return null
  const target = clampTarget(raw.target)
  const done = clampDone(raw.done, target)
  const complete = done >= target
  return {
    id: typeof raw.id === 'string' && raw.id ? raw.id : fallbackId(),
    title,
    unit: isUnitKey(raw.unit) ? raw.unit : 'none',
    target,
    done,
    focusMs: Math.max(0, Number(raw.focusMs) || 0),
    createdAt: Number(raw.createdAt) || Date.now(),
    // A stale `doneAt` on an unfinished task is worse than none at all.
    doneAt: complete ? Number(raw.doneAt) || null : null,
  }
}

export function normalizePlan(raw) {
  if (!raw || typeof raw !== 'object') return emptyPlan()
  const tasks = Array.isArray(raw.tasks) ? raw.tasks.map(normalizeTask).filter(Boolean) : []
  const activeId = tasks.some((t) => t.id === raw.activeId) ? raw.activeId : null
  return { tasks, activeId }
}

/**
 * Everything the UI needs to talk about the plan, computed in one pass.
 *
 * `progress` is weighted by target rather than by task count: five chapters
 * and one page aren't equal amounts of work, and the number should say how far
 * through the *work* you are, not how many rows you ticked.
 */
export function planStats(plan) {
  const tasks = plan?.tasks || []
  const total = tasks.length
  const doneCount = tasks.filter(isTaskDone).length
  const targetSum = tasks.reduce((sum, t) => sum + t.target, 0)
  const doneSum = tasks.reduce((sum, t) => sum + Math.min(t.done, t.target), 0)

  return {
    tasks,
    total,
    doneCount,
    openCount: total - doneCount,
    targetSum,
    doneSum,
    progress: targetSum > 0 ? doneSum / targetSum : 0,
    focusMs: tasks.reduce((sum, t) => sum + (t.focusMs || 0), 0),
    active: tasks.find((t) => t.id === plan?.activeId) || null,
  }
}

// --- edits ------------------------------------------------------------------
// All three keep `doneAt` honest: it's stamped the first time a task reaches
// its target and cleared the moment it drops back below.

/** Move the done counter, clamped to the target. */
export function withDone(task, done, at = Date.now()) {
  const next = clampDone(done, task.target)
  return { ...task, done: next, doneAt: next >= task.target ? task.doneAt || at : null }
}

/** Tick a task off — or untick it back to zero. */
export function toggleTaskDone(task, at = Date.now()) {
  const complete = isTaskDone(task)
  return { ...task, done: complete ? 0 : task.target, doneAt: complete ? null : at }
}

/** Apply a partial edit, re-clamping everything it touches. */
export function applyTaskPatch(task, patch, at = Date.now()) {
  const target = patch.target === undefined ? task.target : clampTarget(patch.target)
  const done = clampDone(patch.done === undefined ? task.done : patch.done, target)
  const title =
    patch.title === undefined ? task.title : String(patch.title).trim().slice(0, MAX_TITLE)
  const unit =
    patch.unit === undefined ? task.unit : isUnitKey(patch.unit) ? patch.unit : task.unit
  return {
    ...task,
    title: title || task.title,
    unit,
    target,
    done,
    doneAt: done >= target ? task.doneAt || at : null,
  }
}

/** "2/4 pages" · "0/1" · "done" — the row's progress label. */
export function progressLabel(task) {
  const unit = task.unit === 'none' ? '' : ` ${task.unit}`
  if (isTaskDone(task)) return unit ? `all ${task.target}${unit}` : 'done'
  return `${task.done}/${task.target}${unit}`
}

/** The same thing, short enough for the summary's day rows. */
export function progressRatio(task) {
  return `${task.done}/${task.target}`
}
