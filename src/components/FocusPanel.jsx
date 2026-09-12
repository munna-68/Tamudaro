import { AnimatePresence, motion } from 'framer-motion'
import TimerRing from './TimerRing'
import Mascot from './Mascot'
import ChunkyButton from './ChunkyButton'
import { LAP_MS, LAP_MINUTES, formatClock } from '../lib/time'

export const FOCUS_GREEN = '#58CC02'

/**
 * Focus mode: a stopwatch that counts up forever, with a ring that laps every
 * 25 minutes. Hitting a lap banks a session and the ring starts over — the
 * clock never stops on its own.
 */
export default function FocusPanel({ timer, celebrate, onTakeBreak }) {
  const { elapsedMs, lapProgress, lapIndex, running, hasStarted } = timer
  const lapElapsed = elapsedMs % LAP_MS

  const mood = celebrate ? 'celebrate' : running ? 'focus' : hasStarted ? 'sleep' : 'idle'

  return (
    <motion.div
      className="panel"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -18 }}
      transition={{ type: 'spring', stiffness: 320, damping: 30 }}
    >
      <div className="ring-area">
        <TimerRing progress={lapProgress} accent={FOCUS_GREEN} celebrate={celebrate}>
          <Mascot mood={mood} size={120} />
          <motion.div
            className="clock"
            animate={celebrate ? { scale: [1, 1.14, 1], rotate: [0, -3, 3, 0] } : { scale: 1 }}
            transition={{ duration: 0.7 }}
          >
            {formatClock(elapsedMs)}
          </motion.div>
          <div className="clock-sub">
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span
                key={running ? 'running' : 'stopped'}
                initial={{ scale: 0.7, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.7, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 500, damping: 26 }}
                className={`pill ${running ? 'pill--green' : 'pill--muted'}`}
              >
                {running ? 'focusing' : hasStarted ? 'paused' : 'ready'}
              </motion.span>
            </AnimatePresence>
          </div>
        </TimerRing>

        <div className="lap-readout">
          <span className="lap-readout__lap">
            {lapIndex === 0 ? 'Lap 1' : `Lap ${lapIndex + 1}`}
          </span>
          <span className="lap-readout__dots" aria-hidden="true">
            {Array.from({ length: 5 }).map((_, i) => (
              <motion.span
                key={i}
                className="lap-dot"
                animate={{
                  scale: lapElapsed / LAP_MS > i / 5 ? 1 : 0.62,
                  opacity: lapElapsed / LAP_MS > i / 5 ? 1 : 0.4,
                }}
                transition={{ type: 'spring', stiffness: 500, damping: 24 }}
              />
            ))}
          </span>
          <span className="lap-readout__time">
            {formatClock(lapElapsed)} <em>/ {LAP_MINUTES}:00</em>
          </span>
        </div>
      </div>

      <div className="action-bar">
        <ChunkyButton
          tone={running ? 'paper' : 'green'}
          onClick={timer.toggle}
          full
          wiggle={!running}
        >
          {running ? '⏸  Pause' : hasStarted ? '▶  Keep going' : '▶  Start Focus'}
        </ChunkyButton>

        <div className="action-row">
          <ChunkyButton tone="ghost" size="md" onClick={onTakeBreak}>
            🛋️ Take a break
          </ChunkyButton>
          <ChunkyButton
            tone="ghost"
            size="md"
            onClick={timer.reset}
            disabled={!hasStarted}
            aria-label="Reset the stopwatch"
          >
            ↺ Reset
          </ChunkyButton>
        </div>
      </div>
    </motion.div>
  )
}
