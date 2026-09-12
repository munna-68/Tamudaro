import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion, useDragControls } from 'framer-motion'
import ChunkyButton from './ChunkyButton'
import {
  LAP_MINUTES,
  dayKey,
  formatDurationWords,
  formatMinutes,
  formatTimeOfDay,
} from '../lib/time'
import { RANGE_OPTIONS, dayLabel, rangeOption, rangeSpanLabel } from '../lib/ranges'

const BLANK_DAY = { focusCount: 0, breakCount: 0, focusMs: 0, breakSec: 0 }

/**
 * The summary, as a pull-up sheet you can drag back down.
 *
 * It opens on the last couple of days and can be widened to the week or the
 * month — totals on top, then a day-by-day breakdown, then every break with
 * the reason attached. The reasons are the whole point: they're what let you
 * look back and remember why you stepped away.
 */
export default function SummarySheet({
  open,
  onClose,
  range,
  onRangeChange,
  rangeStats,
  today,
  onClear,
}) {
  const dragControls = useDragControls()
  const [confirming, setConfirming] = useState(false)

  const option = rangeOption(range)
  const { breaks, keys, perDay } = rangeStats
  const multiDay = keys.length > 1
  const span = rangeSpanLabel(keys)
  const hasAnything = rangeStats.focusCount > 0 || rangeStats.breakCount > 0

  // Switching windows (or closing the sheet) cancels a pending clear — the
  // confirmation must never survive a context change.
  useEffect(() => {
    setConfirming(false)
  }, [range, open])

  // ...and it times out on its own so the button can't sit armed forever.
  useEffect(() => {
    if (!confirming) return undefined
    const t = window.setTimeout(() => setConfirming(false), 4000)
    return () => window.clearTimeout(t)
  }, [confirming])

  const rows = useMemo(() => {
    if (!multiDay) return []
    // A short window lists every day — seeing a blank yesterday is useful.
    // A month would be 31 mostly-empty rows, so it lists only days that
    // actually recorded something.
    if (keys.length <= 7) {
      const byKey = new Map(perDay.map((d) => [d.key, d]))
      return keys.map((key) => ({ key, ...BLANK_DAY, ...byKey.get(key) }))
    }
    return perDay
  }, [keys, perDay, multiDay])

  const handleClear = () => {
    if (!confirming) {
      setConfirming(true)
      return
    }
    setConfirming(false)
    onClear()
  }

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
            className="sheet"
            role="dialog"
            aria-modal="true"
            aria-label={`${option.title} summary`}
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
                  <h2>{option.title}</h2>
                  <p className="sheet__date">{span}</p>
                </div>
                <motion.span
                  className="sheet__sticker"
                  animate={{ rotate: [0, 10, -10, 0], y: [0, -4, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                  aria-hidden="true"
                >
                  📋
                </motion.span>
              </header>

              <div className="range-tabs" role="group" aria-label="Summary range">
                {RANGE_OPTIONS.map((o) => (
                  <button
                    key={o.key}
                    type="button"
                    className={`range-tab ${range === o.key ? 'is-on' : ''}`}
                    aria-pressed={range === o.key}
                    onClick={() => onRangeChange(o.key)}
                  >
                    {o.chip}
                  </button>
                ))}
              </div>

              <div className="sheet__totals">
                <div className="total total--green">
                  <span className="total__num">{rangeStats.focusCount}</span>
                  <span className="total__label">
                    focus {rangeStats.focusCount === 1 ? 'session' : 'sessions'}
                  </span>
                </div>
                <div className="total total--red">
                  <span className="total__num">{rangeStats.breakCount}</span>
                  <span className="total__label">
                    {rangeStats.breakCount === 1 ? 'break' : 'breaks'}
                  </span>
                </div>
                <div className="total total--yellow">
                  <span className="total__num">
                    {formatMinutes(rangeStats.totalFocusMs / 60000)}
                  </span>
                  <span className="total__label">in focus</span>
                </div>
              </div>

              {rangeStats.focusCount > 0 && (
                <p className="sheet__line">
                  That&apos;s{' '}
                  <strong>
                    {formatMinutes(rangeStats.focusCount * LAP_MINUTES)} of laps
                  </strong>{' '}
                  banked,{' '}
                  {rangeStats.focusCount === 1
                    ? 'one lap'
                    : `${rangeStats.focusCount} laps`}{' '}
                  at {LAP_MINUTES} min each
                  {multiDay &&
                    ` across ${
                      rangeStats.activeDays === 1
                        ? 'a single day'
                        : `${rangeStats.activeDays} days`
                    }`}
                  .
                </p>
              )}

              {multiDay && rows.length > 0 && (
                <>
                  <h3 className="sheet__section">Day by day</h3>
                  <ul className="day-list">
                    {rows.map((d, i) => (
                      <motion.li
                        key={d.key}
                        className={`day-row ${d.focusCount || d.breakCount ? '' : 'is-blank'}`}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{
                          delay: Math.min(i * 0.03, 0.24),
                          type: 'spring',
                          stiffness: 420,
                          damping: 30,
                        }}
                      >
                        <span className="day-row__name">{dayLabel(d.key, today)}</span>
                        <span className="day-row__pills">
                          <span
                            className="day-row__pill day-row__pill--green"
                            title={`${d.focusCount} focus ${
                              d.focusCount === 1 ? 'session' : 'sessions'
                            }`}
                          >
                            <span aria-hidden="true">✅</span>
                            {d.focusCount}
                          </span>
                          <span
                            className="day-row__pill day-row__pill--red"
                            title={`${d.breakCount} ${
                              d.breakCount === 1 ? 'break' : 'breaks'
                            }`}
                          >
                            <span aria-hidden="true">🫧</span>
                            {d.breakCount}
                          </span>
                        </span>
                        <span className="day-row__mins">
                          {d.focusMs ? formatMinutes(d.focusMs / 60000) : '—'}
                        </span>
                      </motion.li>
                    ))}
                  </ul>
                </>
              )}

              <h3 className="sheet__section">
                Why you stepped away
                {breaks.length > 0 && <span className="sheet__count">{breaks.length}</span>}
              </h3>

              {breaks.length === 0 ? (
                <div className="empty">
                  <motion.span
                    className="empty__emoji"
                    animate={{ y: [0, -8, 0], rotate: [0, 8, -8, 0] }}
                    transition={{ duration: 3.4, repeat: Infinity, ease: 'easeInOut' }}
                    aria-hidden="true"
                  >
                    🌱
                  </motion.span>
                  <p>
                    {multiDay
                      ? 'No breaks in this stretch. Go easy on yourself — breaks are part of the work.'
                      : 'No breaks yet today. Go easy on yourself — breaks are part of the work.'}
                  </p>
                </div>
              ) : (
                <ul className="reason-list">
                  {breaks.map((b, i) => (
                    <motion.li
                      key={b.id}
                      className="reason"
                      initial={{ opacity: 0, x: -14 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{
                        delay: Math.min(i * 0.045, 0.3),
                        type: 'spring',
                        stiffness: 420,
                        damping: 30,
                      }}
                    >
                      <span className="reason__dot" aria-hidden="true" />
                      <div className="reason__main">
                        <p className="reason__text">{b.reason}</p>
                        <span className="reason__meta">
                          {multiDay && (
                            <em className="reason__day">
                              {dayLabel(dayKey(new Date(b.startedAt)), today)}
                            </em>
                          )}
                          {formatTimeOfDay(b.startedAt)} ·{' '}
                          {b.endedEarly
                            ? `${formatDurationWords(b.actualSec)} of ${formatMinutes(
                                b.plannedSec / 60,
                              )}`
                            : formatMinutes(b.plannedSec / 60)}
                          {b.endedEarly && <em className="tag">cut short</em>}
                        </span>
                      </div>
                    </motion.li>
                  ))}
                </ul>
              )}

              {breaks.length > 0 && rangeStats.longestBreakSec > 0 && (
                <p className="sheet__line sheet__line--muted">
                  Longest break: {formatDurationWords(rangeStats.longestBreakSec)}.
                </p>
              )}

              <p className="sheet__line sheet__line--muted">
                {multiDay
                  ? `Everything resets at local midnight — your ${LAP_MINUTES}-minute laps start fresh each day.`
                  : `Everything resets at local midnight — your ${LAP_MINUTES}-minute laps start fresh tomorrow.`}
              </p>

              <div className="sheet__foot">
                <ChunkyButton
                  tone={confirming ? 'red' : 'ghost'}
                  size="md"
                  onClick={handleClear}
                  disabled={!hasAnything}
                >
                  {confirming ? 'Tap to confirm' : option.clear}
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
