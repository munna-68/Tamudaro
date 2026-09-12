import { useState } from 'react'
import { motion } from 'framer-motion'
import ChunkyButton from './ChunkyButton'
import { formatMinutes } from '../lib/time'

const PRESETS = [5, 10, 15, 20, 30]

const QUICK_REASONS = [
  '☕ Coffee',
  '🚶 Stretch',
  '🍎 Snack',
  '👀 Eyes rest',
  '🚻 Bathroom',
]

/**
 * The gate in front of every break.
 *
 * Two required things: WHY you're stepping away, and for HOW LONG. Naming the
 * reason is the whole point of the feature — it's what makes the summary worth
 * reading later.
 */
export default function BreakForm({ onStart, onCancel, compact = false }) {
  const [reason, setReason] = useState('')
  const [minutes, setMinutes] = useState(10)
  const [custom, setCustom] = useState(false)
  const [customValue, setCustomValue] = useState('7')

  const trimmed = reason.trim()
  const ready = trimmed.length > 0 && minutes > 0

  const pickCustom = () => {
    setCustom(true)
    const parsed = Number.parseInt(customValue, 10)
    if (Number.isFinite(parsed) && parsed > 0) setMinutes(parsed)
  }

  const commitCustom = (value) => {
    setCustomValue(value)
    const parsed = Number.parseInt(value, 10)
    if (Number.isFinite(parsed) && parsed > 0) setMinutes(Math.min(180, parsed))
  }

  return (
    <motion.div
      className={`panel panel--form ${compact ? 'is-compact' : ''}`}
      initial={{ opacity: 0, y: 26, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -18, scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 330, damping: 30 }}
    >
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
          placeholder="stretch my legs, the wall is winning…"
          rows={2}
          maxLength={160}
          autoFocus
        />
        <span className={`field__hint ${ready ? 'is-ok' : ''}`}>
          {trimmed.length === 0
            ? 'Required — a few words is plenty'
            : `${trimmed.length}/160`}
        </span>
      </label>

      <div className="chips">
        {QUICK_REASONS.map((q) => (
          <button
            key={q}
            type="button"
            className="chip"
            onClick={() => setReason(q.replace(/^\S+\s/, ''))}
          >
            {q}
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
          <motion.button
            type="button"
            className={`duration duration--custom ${custom ? 'is-active' : ''}`}
            onClick={pickCustom}
            whileTap={{ scale: 0.92, y: 3 }}
          >
            {custom ? (
              <input
                className="duration__input"
                value={customValue}
                onChange={(e) => commitCustom(e.target.value.replace(/[^\d]/g, ''))}
                inputMode="numeric"
                maxLength={3}
                aria-label="Custom break length in minutes"
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <span aria-hidden="true">✏️</span>
            )}
            <em>{custom ? 'min' : 'custom'}</em>
          </motion.button>
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
    </motion.div>
  )
}
