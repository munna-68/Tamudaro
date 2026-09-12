import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'

const INK = '#24244A'
const CHEEK = '#FF7FB2'

/**
 * Blink loop with human-ish randomness so it never feels metronomic.
 */
function useBlink(active) {
  const [blinking, setBlinking] = useState(false)
  useEffect(() => {
    if (!active) {
      setBlinking(false)
      return undefined
    }
    let openTimer = 0
    let shutTimer = 0
    let cancelled = false

    const scheduleBlink = () => {
      if (cancelled) return
      openTimer = window.setTimeout(
        () => {
          if (cancelled) return
          setBlinking(true)
          shutTimer = window.setTimeout(() => {
            setBlinking(false)
            scheduleBlink()
          }, 120)
        },
        1600 + Math.random() * 2800,
      )
    }
    scheduleBlink()

    return () => {
      cancelled = true
      window.clearTimeout(openTimer)
      window.clearTimeout(shutTimer)
    }
  }, [active])
  return blinking
}

const SPRING = { type: 'spring', stiffness: 420, damping: 22, mass: 0.7 }

/**
 * The face that lives inside the timer ring.
 *
 * Moods:
 *   idle      — resting, curious, blinks
 *   focus     — determined: angled brows, squinting, small set mouth
 *   break     — blissed out: happy closed eyes, wide grin
 *   celebrate — star eyes, open mouth, tongue out
 *   sleep     — paused: eyes shut, tiny breathing mouth
 */
export default function Mascot({ mood = 'idle', size = 132 }) {
  const blinking = useBlink(mood === 'idle' || mood === 'focus')
  const closedEyes = mood === 'break' || mood === 'sleep'
  const starEyes = mood === 'celebrate'
  const squint = mood === 'focus'

  const eyeScaleY = blinking ? 0.06 : squint ? 0.62 : 1

  const browAnimate =
    mood === 'focus'
      ? { rotate: 0, y: 0, opacity: 1, scaleX: 1 }
      : mood === 'celebrate' || mood === 'break'
        ? { rotate: 0, y: -7, opacity: 1, scaleX: 1 }
        : mood === 'sleep'
          ? { rotate: 0, y: 4, opacity: 0.35, scaleX: 0.9 }
          : { rotate: 0, y: 0, opacity: 1, scaleX: 1 }

  return (
    <motion.svg
      className="mascot"
      width={size}
      height={size}
      viewBox="0 0 200 200"
      aria-hidden="true"
      animate={
        mood === 'celebrate'
          ? { rotate: [0, -5, 5, -3, 0], scale: [1, 1.1, 0.97, 1.04, 1] }
          : mood === 'sleep'
            ? { scale: [1, 1.035, 1], y: [0, 3, 0] }
            : { rotate: [0, 1.6, 0, -1.6, 0], y: [0, -3, 0] }
      }
      transition={
        mood === 'celebrate'
          ? { duration: 0.9, ease: 'easeInOut' }
          : mood === 'sleep'
            ? { duration: 3.6, repeat: Infinity, ease: 'easeInOut' }
            : { duration: 5.5, repeat: Infinity, ease: 'easeInOut' }
      }
      style={{ display: 'block', overflow: 'visible' }}
    >
      <defs>
        <clipPath id="mascot-mouth-clip">
          <path d="M 68 114 Q 100 176 132 114 Z" />
        </clipPath>
      </defs>

      {/* cheeks — extra rosy when happy */}
      <motion.g
        animate={{ opacity: mood === 'celebrate' || mood === 'break' ? 0.75 : 0.5 }}
        transition={{ duration: 0.35 }}
      >
        <ellipse cx="40" cy="120" rx="14" ry="10" fill={CHEEK} />
        <ellipse cx="160" cy="120" rx="14" ry="10" fill={CHEEK} />
      </motion.g>

      {/* eyebrows — two shapes cross-faded rather than morphing `d`, because
          animating the path data directly makes browsers choke. */}
      <motion.g
        stroke={INK}
        strokeWidth="7"
        strokeLinecap="round"
        fill="none"
        animate={browAnimate}
        transition={SPRING}
        style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
      >
        <motion.path
          d="M 54 60 Q 70 53 86 60"
          animate={{ opacity: squint ? 0 : 1 }}
          transition={{ duration: 0.25 }}
        />
        <motion.path
          d="M 54 56 Q 70 62 86 70"
          animate={{ opacity: squint ? 1 : 0 }}
          transition={{ duration: 0.25 }}
        />
        <motion.path
          d="M 114 60 Q 130 53 146 60"
          animate={{ opacity: squint ? 0 : 1 }}
          transition={{ duration: 0.25 }}
        />
        <motion.path
          d="M 114 70 Q 130 62 146 56"
          animate={{ opacity: squint ? 1 : 0 }}
          transition={{ duration: 0.25 }}
        />
      </motion.g>

      {/* eyes */}
      {closedEyes ? (
        <g stroke={INK} strokeWidth="8" strokeLinecap="round" fill="none">
          {mood === 'sleep' ? (
            <>
              <path d="M 54 88 Q 70 102 86 88" />
              <path d="M 114 88 Q 130 102 146 88" />
            </>
          ) : (
            <>
              <path d="M 54 96 Q 70 80 86 96" />
              <path d="M 114 96 Q 130 80 146 96" />
            </>
          )}
        </g>
      ) : starEyes ? (
        <g fill={INK}>
          <path d="M 70 74 L 77 90 L 93 96 L 77 102 L 70 118 L 63 102 L 47 96 L 63 90 Z" />
          <path d="M 130 74 L 137 90 L 153 96 L 137 102 L 130 118 L 123 102 L 107 96 L 123 90 Z" />
        </g>
      ) : (
        <>
          <motion.g
            animate={{ scaleY: eyeScaleY }}
            transition={{ duration: blinking ? 0.08 : 0.22, ease: 'easeOut' }}
            style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
          >
            <ellipse cx="70" cy="92" rx="17" ry="19" fill="#FFFFFF" stroke={INK} strokeWidth="6" />
            <circle cx="71" cy="94" r="8.5" fill={INK} />
            <circle cx="67" cy="88" r="3.4" fill="#FFFFFF" />
          </motion.g>
          <motion.g
            animate={{ scaleY: eyeScaleY }}
            transition={{ duration: blinking ? 0.08 : 0.22, ease: 'easeOut' }}
            style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
          >
            <ellipse cx="130" cy="92" rx="17" ry="19" fill="#FFFFFF" stroke={INK} strokeWidth="6" />
            <circle cx="131" cy="94" r="8.5" fill={INK} />
            <circle cx="127" cy="88" r="3.4" fill="#FFFFFF" />
          </motion.g>
        </>
      )}

      {/* mouth */}
      {mood === 'celebrate' ? (
        <>
          <path d="M 68 114 Q 100 176 132 114 Z" fill={INK} />
          <g clipPath="url(#mascot-mouth-clip)">
            <ellipse cx="100" cy="160" rx="17" ry="12" fill="#FF7FA8" />
          </g>
        </>
      ) : mood === 'break' ? (
        <path
          d="M 74 122 Q 100 154 126 122"
          stroke={INK}
          strokeWidth="8"
          strokeLinecap="round"
          fill="none"
        />
      ) : mood === 'focus' ? (
        <path
          d="M 84 128 Q 100 138 116 128"
          stroke={INK}
          strokeWidth="8"
          strokeLinecap="round"
          fill="none"
        />
      ) : mood === 'sleep' ? (
        <ellipse cx="100" cy="130" rx="10" ry="12" fill={INK} />
      ) : (
        <path
          d="M 78 122 Q 100 148 122 122"
          stroke={INK}
          strokeWidth="8"
          strokeLinecap="round"
          fill="none"
        />
      )}
    </motion.svg>
  )
}
