// ---------------------------------------------------------------------------
// Celebrations. Confetti in the app's own palette, plus a haptic nudge on
// phones that support it.
// ---------------------------------------------------------------------------

import confetti from 'canvas-confetti'

const GREEN = ['#58CC02', '#7BE02A', '#A6F04A', '#FFFFFF', '#FFC800']
const RED = ['#FF4B4B', '#FF7676', '#FFA3A3', '#FFFFFF', '#FFC800']
const MIXED = ['#58CC02', '#FF4B4B', '#FFC800', '#22A7F0', '#B266FF', '#FF8FD0', '#FFFFFF']

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

function vibrate(pattern) {
  try {
    if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(pattern)
  } catch {
    /* unsupported */
  }
}

/** Focus lap banked — the big one. Ring flashes green, confetti from both sides. */
export function celebrateFocusLap() {
  vibrate([0, 45, 60, 45])
  if (prefersReducedMotion()) return

  confetti({
    particleCount: 70,
    spread: 78,
    startVelocity: 46,
    origin: { x: 0.5, y: 0.42 },
    colors: GREEN,
    scalar: 1.05,
    ticks: 190,
    disableForReducedMotion: true,
  })

  window.setTimeout(() => {
    confetti({
      particleCount: 42,
      angle: 60,
      spread: 62,
      origin: { x: 0.02, y: 0.62 },
      colors: GREEN,
      disableForReducedMotion: true,
    })
    confetti({
      particleCount: 42,
      angle: 120,
      spread: 62,
      origin: { x: 0.98, y: 0.62 },
      colors: GREEN,
      disableForReducedMotion: true,
    })
  }, 130)
}

/** Break begins — smaller puff, red-leaning. */
export function celebrateBreakStart() {
  vibrate([0, 30, 40, 30])
  if (prefersReducedMotion()) return
  confetti({
    particleCount: 46,
    spread: 92,
    startVelocity: 34,
    origin: { x: 0.5, y: 0.45 },
    colors: RED,
    scalar: 0.95,
    ticks: 150,
    disableForReducedMotion: true,
  })
}

/** Break finished — mixed, a "back to it" shower from the top. */
export function celebrateBreakDone() {
  vibrate([0, 35, 50, 35])
  if (prefersReducedMotion()) return
  confetti({
    particleCount: 55,
    spread: 100,
    startVelocity: 30,
    origin: { x: 0.5, y: 0.1 },
    colors: MIXED,
    gravity: 1.1,
    ticks: 200,
    disableForReducedMotion: true,
  })
}

/** A cheeky star puff for the summary sheet's empty state. */
export function celebrateStars() {
  if (prefersReducedMotion()) return
  const star = confetti.shapeFromText ? confetti.shapeFromText({ text: '⭐', scalar: 2 }) : null
  confetti({
    particleCount: 18,
    spread: 110,
    startVelocity: 26,
    origin: { x: 0.5, y: 0.4 },
    colors: MIXED,
    shapes: star ? [star] : undefined,
    scalar: star ? 2 : 1,
    disableForReducedMotion: true,
  })
}
