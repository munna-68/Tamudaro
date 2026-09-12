import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

const SIZE = 340
const CENTER = 170
const RADIUS = 128
const BAND = 32
const OUTLINE = 46
const DISC_R = RADIUS - OUTLINE / 2
const CIRCUMFERENCE = 2 * Math.PI * RADIUS
const INK = '#24244A'

/** Where on the ring a given fraction (0..1) sits, starting at 12 o'clock. */
function pointOnRing(fraction, radius = RADIUS) {
  const angle = (-90 + 360 * fraction) * (Math.PI / 180)
  return {
    x: CENTER + radius * Math.cos(angle),
    y: CENTER + radius * Math.sin(angle),
  }
}

const MILESTONES = [0.2, 0.4, 0.6, 0.8]

/**
 * The big circular timer.
 *
 * `progress` is 0..1 around the ring. Focus fills it up (empty at 0:00, full
 * at 25:00); break drains it down (full at the start, empty at 0:00).
 *
 * Two things worth knowing:
 *
 * 1. The lap wrap. When focus progress rolls 0.999 -> 0.001 the ring would
 *    visibly snap from full to empty. We catch that wrap in a layout effect
 *    and pin the ring at full until the celebration disc has grown over it,
 *    so the reset is never seen.
 * 2. The finish. On a completed lap the ring flashes white and settles into a
 *    solid disc of the accent colour before popping away.
 */
export default function TimerRing({
  progress = 0,
  accent = '#58CC02',
  celebrate = null,
  milestones = true,
  paused = false,
  children,
}) {
  const [holdFull, setHoldFull] = useState(false)
  const previousProgress = useRef(progress)

  // Catch the lap wrap before the browser paints the empty ring.
  useLayoutEffect(() => {
    if (progress + 0.5 < previousProgress.current) {
      setHoldFull(true)
      previousProgress.current = progress
      const timer = window.setTimeout(() => setHoldFull(false), 340)
      return () => window.clearTimeout(timer)
    }
    previousProgress.current = progress
    return undefined
  }, [progress])

  // A fresh celebration also pins the ring full, in case the wrap was missed.
  useEffect(() => {
    if (!celebrate) return undefined
    setHoldFull(true)
    const timer = window.setTimeout(() => setHoldFull(false), 340)
    return () => window.clearTimeout(timer)
  }, [celebrate?.id])

  const shown = celebrate ? 1 : holdFull ? 1 : progress
  const offset = CIRCUMFERENCE * (1 - Math.min(1, Math.max(0, shown)))
  const bead = pointOnRing(Math.min(1, Math.max(0, shown)))
  const showBead = shown > 0.012 && shown < 0.988

  const isBreak = accent.toLowerCase() === '#ff4b4b'

  return (
    <div className="ring-wrap">
      <motion.div
        className="ring-inner-wrap"
        animate={
          celebrate
            ? { scale: [1, 1.07, 0.95, 1.03, 1], rotate: [0, -2, 2, -1, 0] }
            : { scale: 1, rotate: 0 }
        }
        transition={
          celebrate
            ? { duration: 1.1, times: [0, 0.16, 0.42, 0.68, 1], ease: 'easeOut' }
            : { duration: 0.3 }
        }
      >
        <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="ring-svg">
          {/* chunky cartoon outline */}
          <circle
            cx={CENTER}
            cy={CENTER}
            r={RADIUS}
            fill="none"
            stroke={INK}
            strokeWidth={OUTLINE}
          />
          {/* track */}
          <circle
            cx={CENTER}
            cy={CENTER}
            r={RADIUS}
            fill="none"
            stroke={isBreak ? '#FADADA' : '#EFE4CB'}
            strokeWidth={BAND}
          />

          {/* lap milestones, lit up as you pass them */}
          {milestones &&
            MILESTONES.map((fraction) => {
              const { x, y } = pointOnRing(fraction, RADIUS + 31)
              const passed = shown >= fraction
              return (
                <circle
                  key={fraction}
                  cx={x}
                  cy={y}
                  r={passed ? 6 : 5}
                  fill={passed ? accent : '#D9CDB4'}
                  stroke={passed ? INK : 'none'}
                  strokeWidth={passed ? 3 : 0}
                />
              )
            })}

          {/* the filling / draining arc */}
          <circle
            cx={CENTER}
            cy={CENTER}
            r={RADIUS}
            fill="none"
            stroke={accent}
            strokeWidth={BAND}
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={offset}
            transform={`rotate(-90 ${CENTER} ${CENTER})`}
            style={{ transition: paused ? 'none' : 'stroke 240ms ease' }}
          />

          {/* the little bead riding the tip of the arc */}
          <AnimatePresence>
            {showBead && (
              <motion.circle
                key="bead"
                cx={bead.x}
                cy={bead.y}
                r={11}
                fill="#FFFFFF"
                stroke={INK}
                strokeWidth={6}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                transition={{ type: 'spring', stiffness: 500, damping: 24 }}
                style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
              />
            )}
          </AnimatePresence>

          {/* the finish: flash, settle into a solid disc, pop away */}
          <AnimatePresence>
            {celebrate && (
              <motion.circle
                key={`disc-${celebrate.id}`}
                cx={CENTER}
                cy={CENTER}
                r={DISC_R}
                fill={accent}
                initial={{ scale: 0, opacity: 1 }}
                animate={{ scale: [0, 1.08, 1, 1, 0], opacity: [1, 1, 1, 1, 0] }}
                transition={{
                  duration: 1.3,
                  times: [0, 0.16, 0.28, 0.76, 1],
                  ease: 'easeInOut',
                }}
                style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
              />
            )}
          </AnimatePresence>
          <AnimatePresence>
            {celebrate && (
              <motion.circle
                key={`flash-${celebrate.id}`}
                cx={CENTER}
                cy={CENTER}
                r={DISC_R}
                fill="#FFFFFF"
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 0.92, 0] }}
                transition={{ duration: 0.46, times: [0, 0.22, 1] }}
              />
            )}
          </AnimatePresence>
        </svg>

        <div className="ring-inner">{children}</div>
      </motion.div>

      {/* decorative wobble ring, purely for the toy feel */}
      <motion.div
        className="ring-halo"
        aria-hidden="true"
        animate={
          celebrate
            ? { scale: [1, 1.3], opacity: [0.5, 0] }
            : { scale: 1, opacity: 0 }
        }
        transition={{ duration: 0.9, ease: 'easeOut' }}
        style={{ borderColor: accent }}
      />
    </div>
  )
}
