import { AnimatePresence, motion, useDragControls } from 'framer-motion'
import ChunkyButton from './ChunkyButton'
import {
  LAP_MINUTES,
  formatDurationWords,
  formatFriendlyDate,
  formatMinutes,
  formatTimeOfDay,
} from '../lib/time'

/**
 * The end-of-day summary, as a pull-up sheet you can drag back down.
 *
 * Focus totals on top, then every break with the reason attached — the point
 * being that you can look back and remember why you stepped away.
 */
export default function SummarySheet({ open, onClose, stats, day, onClear, today }) {
  const dragControls = useDragControls()
  const focusSessions = day.focusSessions || []
  const breaks = day.breaks || []
  const longestBreak = breaks.reduce((max, b) => Math.max(max, b.actualSec || 0), 0)

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
            aria-label="Today's summary"
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
                  <h2>Today</h2>
                  <p className="sheet__date">{formatFriendlyDate(new Date(`${today}T12:00:00`))}</p>
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

              <div className="sheet__totals">
                <div className="total total--green">
                  <span className="total__num">{stats.focusCount}</span>
                  <span className="total__label">
                    focus {stats.focusCount === 1 ? 'session' : 'sessions'}
                  </span>
                </div>
                <div className="total total--red">
                  <span className="total__num">{stats.breakCount}</span>
                  <span className="total__label">
                    {stats.breakCount === 1 ? 'break' : 'breaks'}
                  </span>
                </div>
                <div className="total total--yellow">
                  <span className="total__num">{formatMinutes(stats.totalFocusMs / 60000)}</span>
                  <span className="total__label">in focus</span>
                </div>
              </div>

              {focusSessions.length > 0 && (
                <p className="sheet__line">
                  That&apos;s{' '}
                  <strong>
                    {formatMinutes(focusSessions.length * LAP_MINUTES)} of laps
                  </strong>{' '}
                  banked, {stats.focusCount === 1 ? 'one lap' : `${stats.focusCount} laps`} at{' '}
                  {LAP_MINUTES} min each.
                </p>
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
                  <p>No breaks yet today. Go easy on yourself — breaks are part of the work.</p>
                </div>
              ) : (
                <ul className="reason-list">
                  {breaks
                    .slice()
                    .reverse()
                    .map((b, i) => (
                      <motion.li
                        key={b.id}
                        className="reason"
                        initial={{ opacity: 0, x: -14 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: Math.min(i * 0.045, 0.3), type: 'spring', stiffness: 420, damping: 30 }}
                      >
                        <span className="reason__dot" aria-hidden="true" />
                        <div className="reason__main">
                          <p className="reason__text">{b.reason}</p>
                          <span className="reason__meta">
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

              {breaks.length > 0 && longestBreak > 0 && (
                <p className="sheet__line sheet__line--muted">
                  Longest break: {formatDurationWords(longestBreak)}.
                </p>
              )}

              <p className="sheet__line sheet__line--muted">
                Everything resets at local midnight — your {LAP_MINUTES}-minute laps start fresh
                tomorrow.
              </p>

              <div className="sheet__foot">
                <ChunkyButton tone="ghost" size="md" onClick={onClear} disabled={!focusSessions.length && !breaks.length}>
                  Clear today
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
