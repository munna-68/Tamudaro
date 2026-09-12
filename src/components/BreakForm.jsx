import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import ChunkyButton from './ChunkyButton'
import { formatMinutes } from '../lib/time'

const PRESETS = [5, 10, 15, 20, 30]

const MIN_MINUTES = 1
const MAX_MINUTES = 180

/** The three reasons this app is actually built around. */
const QUICK_REASONS = [
  { emoji: '🕌', label: 'Namaz' },
  { emoji: '🚿', label: 'Gosol' },
  { emoji: '🍽️', label: 'Kauah' },
]

const QUICK_MINUTES = [5, 15, 30, 45]

const clamp = (n) => Math.min(MAX_MINUTES, Math.max(MIN_MINUTES, n))
const digitsOnly = (s) => s.replace(/[^\d]/g, '').slice(0, 3)

/**
 * The gate in front of every break.
 *
 * Two required things: WHY you're stepping away, and for HOW LONG. Naming the
 * reason is the whole point of the feature — it's what makes the summary worth
 * reading later.
 *
 * The custom duration isn't a field squeezed into the grid: tapping the pencil
 * morphs that tile into a centred card (a shared `layoutId` does the flying
 * animation), you dial in a number, and the tick flies it back to where it
 * came from.
 */
export default function BreakForm({ onStart, onCancel, compact = false }) {
  const [reason, setReason] = useState('')
  const [minutes, setMinutes] = useState(10)
  const [custom, setCustom] = useState(false)
  const [editorOpen, setEditorOpen] = useState(false)
  // Kept as text so the field can be cleared and retyped naturally.
  const [draft, setDraft] = useState('7')

  const trimmed = reason.trim()
  const ready = trimmed.length > 0 && minutes > 0
  const draftNumber = clamp(Number(draft) || MIN_MINUTES)

  const openEditor = () => {
    setDraft(String(custom ? minutes : 7))
    setEditorOpen(true)
  }

  const confirmEditor = () => {
    setMinutes(clamp(Number(draft) || MIN_MINUTES))
    setCustom(true)
    setEditorOpen(false)
  }

  const step = (delta) => setDraft(String(clamp(draftNumber + delta)))

  // Escape closes the editor without changing anything.
  useEffect(() => {
    if (!editorOpen) return undefined
    const onKey = (e) => {
      if (e.key === 'Escape') setEditorOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [editorOpen])

  const editor = (
    <AnimatePresence>
      {editorOpen && (
        <>
          <motion.div
            className="scrim scrim--soft"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            onClick={() => setEditorOpen(false)}
          />
          <div className="editor-layer">
            <motion.div
              layoutId="custom-duration"
              className="editor"
              role="dialog"
              aria-modal="true"
              aria-label="Set a custom break length"
              transition={{ type: 'spring', stiffness: 400, damping: 36 }}
            >
              <p className="editor__title">How many minutes?</p>

              <div className="stepper">
                <motion.button
                  type="button"
                  className="stepper__btn"
                  onClick={() => step(-1)}
                  whileTap={{ scale: 0.88, y: 4 }}
                  aria-label="One minute less"
                >
                  −
                </motion.button>

                <div className="stepper__readout">
                  <input
                    className="stepper__input"
                    value={draft}
                    onChange={(e) => setDraft(digitsOnly(e.target.value))}
                    onBlur={() => setDraft(String(draftNumber))}
                    inputMode="numeric"
                    maxLength={3}
                    autoFocus
                    aria-label="Break length in minutes"
                  />
                  <span className="stepper__unit">min</span>
                </div>

                <motion.button
                  type="button"
                  className="stepper__btn"
                  onClick={() => step(1)}
                  whileTap={{ scale: 0.88, y: 4 }}
                  aria-label="One minute more"
                >
                  +
                </motion.button>
              </div>

              <div className="editor__quick">
                {QUICK_MINUTES.map((v) => (
                  <button
                    key={v}
                    type="button"
                    className={`chip ${draftNumber === v ? 'is-on' : ''}`}
                    onClick={() => setDraft(String(v))}
                  >
                    {v}
                  </button>
                ))}
              </div>

              <motion.button
                type="button"
                className="tick-btn"
                onClick={confirmEditor}
                whileTap={{ scale: 0.93, y: 4 }}
                aria-label={`Confirm a ${draftNumber} minute break`}
              >
                <span aria-hidden="true">✓</span>
              </motion.button>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )

  return (
    <motion.div
      className={`panel panel--form ${compact ? 'is-compact' : ''}`}
      initial={{ opacity: 0, y: 26, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -18, scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 330, damping: 30 }}
    >
      <div className="form-scroll">
        <motion.div
          className="form-head"
          animate={{ rotate: [0, -1.5, 1.5, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        >
          <span className="form-head__emoji" aria-hidden="true">
            🛋️
          </span>
          <h2>Break time!</h2>
          <p>Tell me why you&apos;re stepping away — future you will want to know.</p>
        </motion.div>

        <label className="field">
          <span className="field__label">Why the break?</span>
          <textarea
            className="field__input field__input--area"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="a few words is plenty…"
            rows={2}
            maxLength={160}
          />
          <span className={`field__hint ${ready ? 'is-ok' : ''}`}>
            {trimmed.length === 0 ? 'Required — a few words is plenty' : `${trimmed.length}/160`}
          </span>
        </label>

        <div className="chips">
          {QUICK_REASONS.map((q) => (
            <button
              key={q.label}
              type="button"
              className={`chip ${trimmed === q.label ? 'is-on' : ''}`}
              onClick={() => setReason(q.label)}
            >
              <span aria-hidden="true">{q.emoji}</span> {q.label}
            </button>
          ))}
        </div>

        <div className="field">
          <span className="field__label">How long?</span>
          <div className="duration-grid">
            {PRESETS.map((p) => (
              <motion.button
                key={p}
                type="button"
                className={`duration ${!custom && minutes === p ? 'is-active' : ''}`}
                onClick={() => {
                  setCustom(false)
                  setMinutes(p)
                }}
                whileTap={{ scale: 0.92, y: 3 }}
              >
                {p}
                <em>min</em>
              </motion.button>
            ))}

            {/* This tile is the thing that flies to the middle of the screen.
                It fades out while the editor is out so the two never hold the
                same layoutId at once — that's what makes the return trip
                animate back into this exact slot. */}
            <motion.button
              layoutId="custom-duration"
              type="button"
              className={`duration duration--custom ${custom ? 'is-active' : ''}`}
              onClick={openEditor}
              whileTap={{ scale: 0.92, y: 3 }}
              animate={{ opacity: editorOpen ? 0 : 1 }}
              transition={{
                layout: { type: 'spring', stiffness: 400, damping: 36 },
                opacity: { duration: 0.16 },
              }}
              style={{ pointerEvents: editorOpen ? 'none' : 'auto' }}
              tabIndex={editorOpen ? -1 : 0}
              aria-hidden={editorOpen}
              aria-label={
                custom
                  ? `Custom break length, ${minutes} minutes. Tap to change.`
                  : 'Set a custom break length'
              }
            >
              {custom ? (
                <>
                  {minutes}
                  <em>min</em>
                </>
              ) : (
                <>
                  <span aria-hidden="true">✏️</span>
                  <em>custom</em>
                </>
              )}
            </motion.button>
          </div>
        </div>
      </div>

      <div className="action-bar">
        <ChunkyButton
          tone="red"
          full
          disabled={!ready}
          onClick={() => onStart({ reason: trimmed, minutes })}
          wiggle={ready}
        >
          {ready ? `🫧 Start a ${formatMinutes(minutes)} break` : 'Name it first'}
        </ChunkyButton>
        <div className="action-row">
          <ChunkyButton tone="ghost" size="md" onClick={onCancel}>
            ← Back to focus
          </ChunkyButton>
        </div>
      </div>

      {createPortal(editor, document.body)}
    </motion.div>
  )
}
