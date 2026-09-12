import { AnimatePresence, motion } from 'framer-motion'
import TimerRing from './TimerRing'
import Mascot from './Mascot'
import ChunkyButton from './ChunkyButton'
import { formatClock, formatClockFromSeconds } from '../lib/time'

export const BREAK_RED = '#FF4B4B'

/**
 * Break mode: a red ring draining from full to empty.
 *
 * Direction choice — focus fills up, break drains down. A countdown reads
 * naturally as "time remaining", so the ring starts full and empties out,
 * which also makes the two modes unmistakable at a glance.
 */
export default function BreakPanel({ breakTimer, celebrate, onEndEarly }) {
  const { remainingMs, plannedSec, reason, progress, elapsedMs } = breakTimer
  const mood = celebrate ? 'celebrate' : 'break'
  const nearlyDone = remainingMs <= 60000

  return (
    <motion.div
      className="panel"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -18 }}
      transition={{ type: 'spring', stiffness: 320, damping: 30 }}
    >
      <div className="ring-area">
        <TimerRing
          progress={progress}
          accent={BREAK_RED}
          celebrate={celebrate}
          milestones={false}
        >
          <Mascot mood={mood} size={120} />
          <motion.div
            className="clock"
            animate={
              nearlyDone && !celebrate
                ? { scale: [1, 1.07, 1] }
                : celebrate
                  ? { scale: [1, 1.14, 1] }
                  : { scale: 1 }
            }
            transition={
              nearlyDone && !celebrate
                ? { duration: 1, repeat: Infinity, ease: 'easeInOut' }
                : { duration: 0.7 }
            }
          >
            {formatClock(remainingMs)}
          </motion.div>
          <div className="clock-sub">
            <span className="pill pill--red">on a break</span>
          </div>
        </TimerRing>

        <div className="break-note">
          <span className="break-note__label">because</span>
          <p className="break-note__reason">{reason}</p>
          <span className="break-note__meta">
            {formatClockFromSeconds(elapsedMs / 1000)} in · {formatClockFromSeconds(plannedSec)}{' '}
            planned
          </span>
        </div>
      </div>

      <div className="action-bar">
        <ChunkyButton tone="red" full onClick={onEndEarly} wiggle>
          ⏹ End break now
        </ChunkyButton>
        <div className="action-row">
          <AnimatePresence>
            <motion.span
              className="micro-copy"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              Ending early still counts — it&apos;ll be logged as shortened.
            </motion.span>
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  )
}
