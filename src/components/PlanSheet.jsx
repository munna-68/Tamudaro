import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion, useDragControls } from 'framer-motion'
import ChunkyButton from './ChunkyButton'
import { formatFriendlyDate, formatMinutes } from '../lib/time'
import { MAX_TITLE, UNIT_OPTIONS, isTaskDone, progressLabel } from '../lib/plan'

const MAX_DRAFT_TARGET = 999

const pctOf = (task) =>
  task.target > 0 ? Math.round((Math.min(task.done, task.target) / task.target) * 100) : 0

/** Small round +/− control. Used for both "how much done" and "how much total". */
function MiniStepper({ value, onChange, min = 0, max = MAX_DRAFT_TARGET, label }) {
  return (
    <div className="mini-stepper" role="group" aria-label={label}>
      <button
        type="button"
        onClick={() => onChange(value - 1)}
        disabled={value <= min}
        aria-label="One less"
      >
        −
      </button>
      <span aria-live="polite">{value}</span>
      <button
        type="button"
        onClick={() => onChange(value + 1)}
        disabled={value >= max}
        aria-label="One more"
      >
        +
      </button>
    </div>
  )
}

function UnitChips({ value, onChange }) {
  return (
    <div className="chips chips--units">
      {UNIT_OPTIONS.map((u) => (
        <button
          key={u.key}
          type="button"
          className={`chip ${value === u.key ? 'is-on' : ''}`}
          aria-pressed={value === u.key}
          onClick={() => onChange(u.key)}
        >
          {u.label}
        </button>
      ))}
    </div>
  )
}

function TaskRow({
  task,
  index,
  last,
  active,
  expanded,
  confirming,
  onToggle,
  onNudge,
  onUpdate,
  onSetActive,
  onRemove,
  onMove,
  onExpand,
}) {
  const done = isTaskDone(task)
  const pct = pctOf(task)

  return (
    <motion.li
      layout="position"
      className={`task ${done ? 'is-done' : ''} ${active ? 'is-active' : ''}`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -18 }}
      transition={{
        delay: Math.min(index * 0.03, 0.2),
        type: 'spring',
        stiffness: 420,
        damping: 32,
      }}
    >
      <div className="task__row">
        <motion.button
          type="button"
          className="task__check"
          onClick={onToggle}
          whileTap={{ scale: 0.86, y: 3 }}
          aria-pressed={done}
          aria-label={done ? `Mark ${task.title} as not done` : `Mark ${task.title} done`}
        >
          {done ? <span aria-hidden="true">✓</span> : null}
        </motion.button>

        <button
          type="button"
          className="task__body"
          onClick={onExpand}
          aria-expanded={expanded}
          aria-label={`${task.title} — ${progressLabel(task)}. ${
            expanded ? 'Hide' : 'Show'
          } options.`}
        >
          <span className="task__title">{task.title}</span>
          <span className="task__sub">
            <span className="task__prog">{progressLabel(task)}</span>
            {task.focusMs > 0 && (
              <span className="task__time">⏳ {formatMinutes(task.focusMs / 60000)}</span>
            )}
          </span>
          <span className="task__bar" aria-hidden="true">
            <motion.span
              className="task__fill"
              initial={false}
              animate={{ width: `${pct}%` }}
              transition={{ type: 'spring', stiffness: 280, damping: 30 }}
            />
          </span>
        </button>

        <motion.button
          type="button"
          className="task__now"
          onClick={onSetActive}
          disabled={done}
          whileTap={{ scale: 0.88, y: 3 }}
          aria-pressed={active}
          aria-label={
            active
              ? `Stop tracking ${task.title}`
              : `Track focus time against ${task.title}`
          }
          title={active ? 'Focus time is landing here' : 'Put focus time on this'}
        >
          <span aria-hidden="true">{active ? '●' : '▶'}</span>
        </motion.button>
      </div>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            className="task__edit"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 420, damping: 34 }}
          >
            <div className="task__edit-inner">
              <div className="task__edit-row">
                <span className="task__edit-label">Done so far</span>
                <MiniStepper
                  value={task.done}
                  max={task.target}
                  onChange={(v) => onNudge(v - task.done)}
                  label={`How much of ${task.title} is done`}
                />
              </div>

              <div className="task__edit-row">
                <span className="task__edit-label">How much in total</span>
                <MiniStepper
                  value={task.target}
                  min={1}
                  onChange={(v) => onUpdate({ target: v })}
                  label={`Target for ${task.title}`}
                />
              </div>

              <UnitChips value={task.unit} onChange={(unit) => onUpdate({ unit })} />

              <div className="task__edit-actions">
                <ChunkyButton
                  tone="ghost"
                  size="md"
                  onClick={() => onMove(-1)}
                  disabled={index === 0}
                  aria-label={`Move ${task.title} up`}
                >
                  ↑
                </ChunkyButton>
                <ChunkyButton
                  tone="ghost"
                  size="md"
                  onClick={() => onMove(1)}
                  disabled={last}
                  aria-label={`Move ${task.title} down`}
                >
                  ↓
                </ChunkyButton>
                <ChunkyButton
                  tone={confirming ? 'red' : 'ghost'}
                  size="md"
                  onClick={onRemove}
                  full
                >
                  {confirming ? 'Tap to confirm' : '🗑 Remove'}
                </ChunkyButton>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.li>
  )
}

/**
 * The plan sheet: add what you're covering, dial in how much, tick it off, and
 * point the stopwatch at whichever one you're on right now.
 *
 * It's the same pull-up sheet as the summary — drag it down to dismiss — and
 * the add bar sits at the top rather than the bottom so the keyboard never
 * covers the field you're typing into.
 */
export default function PlanSheet({
  open,
  onClose,
  plan,
  stats,
  autoAdd = false,
  onAdd,
  onUpdate,
  onNudge,
  onToggle,
  onRemove,
  onSetActive,
  onMove,
  onClearDone,
}) {
  const dragControls = useDragControls()

  const [adding, setAdding] = useState(false)
  const [draftTitle, setDraftTitle] = useState('')
  const [draftTarget, setDraftTarget] = useState(1)
  const [draftUnit, setDraftUnit] = useState('none')
  const [expandedId, setExpandedId] = useState(null)
  const [confirmId, setConfirmId] = useState(null)

  const titleRef = useRef(null)

  const tasks = stats.tasks
  const trimmed = draftTitle.trim()
  const canAdd = trimmed.length > 0

  // Opening resets everything; the empty-plan case opens straight into the
  // form, because there's nothing else to look at.
  useEffect(() => {
    if (open) {
      setAdding(autoAdd)
      return
    }
    setAdding(false)
    setExpandedId(null)
    setConfirmId(null)
    setDraftTitle('')
    setDraftTarget(1)
    setDraftUnit('none')
    // `autoAdd` is deliberately read only at the moment of opening — it flips
    // to false as soon as the first task exists, and re-running this would
    // slam the form shut mid-typing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // The delete button arms, then disarms on its own so it can't sit waiting.
  useEffect(() => {
    if (!confirmId) return undefined
    const t = window.setTimeout(() => setConfirmId(null), 4000)
    return () => window.clearTimeout(t)
  }, [confirmId])

  // Focus lands inside the tap that opened the form — the only moment iOS
  // will agree to raise the keyboard.
  useLayoutEffect(() => {
    if (!adding) return undefined
    const input = titleRef.current
    if (!input) return undefined
    const grab = () => input.focus({ preventScroll: true })
    grab()
    const retry = window.setTimeout(() => {
      if (document.activeElement !== input) grab()
    }, 150)
    return () => window.clearTimeout(retry)
  }, [adding])

  const closeAdd = useCallback(() => {
    const active = document.activeElement
    if (active instanceof HTMLElement) active.blur()
    setAdding(false)
    setDraftTitle('')
    setDraftTarget(1)
    setDraftUnit('none')
  }, [])

  const submit = (e) => {
    e.preventDefault()
    if (!canAdd) return
    onAdd({ title: trimmed, target: draftTarget, unit: draftUnit })
    // Stay open: building a list of five things shouldn't take five taps.
    setDraftTitle('')
    titleRef.current?.focus({ preventScroll: true })
  }

  const handleRemove = (id) => {
    if (confirmId !== id) {
      setConfirmId(id)
      return
    }
    setConfirmId(null)
    setExpandedId(null)
    onRemove(id)
  }

  const toggleExpand = useCallback((id) => {
    setExpandedId((prev) => (prev === id ? null : id))
    setConfirmId(null)
  }, [])

  const hasDone = useMemo(() => tasks.some(isTaskDone), [tasks])

  const headline = useMemo(() => {
    if (stats.total === 0) return null
    const pct = Math.round(stats.progress * 100)
    const time = stats.focusMs > 0 ? formatMinutes(stats.focusMs / 60000) : null
    return (
      <>
        That&apos;s <strong>{pct}%</strong> of what you planned, with{' '}
        <strong>{stats.doneCount === stats.total ? 'every task' : `${stats.doneCount} of ${stats.total} tasks`}</strong>{' '}
        ticked off
        {time ? (
          <>
            {' '}
            and <strong>{time}</strong> of focus landed on them
          </>
        ) : null}
        .
      </>
    )
  }, [stats])

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="scrim"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.section
            className="sheet sheet--plan"
            role="dialog"
            aria-modal="true"
            aria-label="Today's plan"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 340, damping: 34 }}
            drag="y"
            dragControls={dragControls}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.55 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 110 || info.velocity.y > 620) onClose()
            }}
          >
            <div
              className="sheet__grab"
              onPointerDown={(e) => dragControls.start(e)}
              role="button"
              tabIndex={0}
              aria-label="Drag to dismiss"
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') onClose()
              }}
            >
              <span className="sheet__handle" />
            </div>

            <div className="sheet__body">
              <header className="sheet__head">
                <div>
                  <h2>Today&apos;s plan</h2>
                  <p className="sheet__date">{formatFriendlyDate()}</p>
                </div>
                <motion.span
                  className="sheet__sticker"
                  animate={{ rotate: [0, 10, -10, 0], y: [0, -4, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                  aria-hidden="true"
                >
                  📝
                </motion.span>
              </header>

              {stats.total > 0 && (
                <div className="sheet__totals">
                  <div className="total total--green">
                    <span className="total__num">
                      {stats.doneCount}/{stats.total}
                    </span>
                    <span className="total__label">tasks done</span>
                  </div>
                  <div className="total total--blue">
                    <span className="total__num">{Math.round(stats.progress * 100)}%</span>
                    <span className="total__label">covered</span>
                  </div>
                  <div className="total total--yellow">
                    <span className="total__num">
                      {stats.focusMs > 0 ? formatMinutes(stats.focusMs / 60000) : '—'}
                    </span>
                    <span className="total__label">on tasks</span>
                  </div>
                </div>
              )}

              {headline && <p className="sheet__line">{headline}</p>}

              {adding ? (
                <form className="add-task" onSubmit={submit}>
                  <div className="add-task__row">
                    <input
                      ref={titleRef}
                      className="add-task__input"
                      value={draftTitle}
                      onChange={(e) => setDraftTitle(e.target.value)}
                      placeholder="What are you covering?"
                      maxLength={MAX_TITLE}
                      enterKeyHint="done"
                      autoComplete="off"
                      autoCorrect="off"
                      spellCheck={false}
                      aria-label="What are you covering?"
                    />
                    <motion.button
                      type="submit"
                      className={`add-task__go ${canAdd ? '' : 'is-off'}`}
                      disabled={!canAdd}
                      whileTap={canAdd ? { scale: 0.9, y: 4 } : undefined}
                      aria-label="Add this to the plan"
                    >
                      <span aria-hidden="true">✓</span>
                    </motion.button>
                  </div>

                  <div className="add-task__meta">
                    <span className="add-task__label">How much?</span>
                    <MiniStepper
                      value={draftTarget}
                      min={1}
                      onChange={setDraftTarget}
                      label="How much are you covering in total"
                    />
                    {draftTarget === 1 && draftUnit === 'none' && (
                      <span className="add-task__hint">a plain tick-box</span>
                    )}
                  </div>

                  <UnitChips value={draftUnit} onChange={setDraftUnit} />

                  <button type="button" className="add-task__cancel" onClick={closeAdd}>
                    Cancel
                  </button>
                </form>
              ) : (
                <motion.button
                  type="button"
                  className="add-task__trigger"
                  onClick={() => setAdding(true)}
                  whileTap={{ scale: 0.98, y: 3 }}
                >
                  <span aria-hidden="true">＋</span> Add something to cover
                </motion.button>
              )}

              {tasks.length === 0 ? (
                <div className="empty">
                  <motion.span
                    className="empty__emoji"
                    animate={{ y: [0, -8, 0], rotate: [0, 8, -8, 0] }}
                    transition={{ duration: 3.4, repeat: Infinity, ease: 'easeInOut' }}
                    aria-hidden="true"
                  >
                    🗺️
                  </motion.span>
                  <p>
                    Nothing planned yet. Name the chapter, the problem set, the thing —
                    then tell the timer which one you&apos;re on. Every 25-minute lap
                    lands on it.
                  </p>
                </div>
              ) : (
                <>
                  <h3 className="sheet__section">
                    What you&apos;re covering
                    <span className="sheet__count sheet__count--green">
                      {stats.doneCount}/{stats.total}
                    </span>
                  </h3>

                  <ul className="task-list">
                    <AnimatePresence initial={false}>
                      {tasks.map((task, i) => (
                        <TaskRow
                          key={task.id}
                          task={task}
                          index={i}
                          last={i === tasks.length - 1}
                          active={plan.activeId === task.id}
                          expanded={expandedId === task.id}
                          confirming={confirmId === task.id}
                          onToggle={() => onToggle(task.id)}
                          onNudge={(delta) => onNudge(task.id, delta)}
                          onUpdate={(patch) => onUpdate(task.id, patch)}
                          onSetActive={() => onSetActive(task.id)}
                          onRemove={() => handleRemove(task.id)}
                          onMove={(delta) => onMove(task.id, delta)}
                          onExpand={() => toggleExpand(task.id)}
                        />
                      ))}
                    </AnimatePresence>
                  </ul>
                </>
              )}

              <p className="sheet__line sheet__line--muted">
                Tap ▶ to point the stopwatch at a task — each 25-minute lap it banks
                lands on whichever one is lit up. The plan resets at local midnight,
                same as everything else.
              </p>

              <div className="sheet__foot">
                <ChunkyButton
                  tone="ghost"
                  size="md"
                  onClick={onClearDone}
                  disabled={!hasDone}
                >
                  Clear done
                </ChunkyButton>
                <ChunkyButton tone="paper" size="md" onClick={onClose}>
                  Done
                </ChunkyButton>
              </div>
            </div>
          </motion.section>
        </>
      )}
    </AnimatePresence>
  )
}
