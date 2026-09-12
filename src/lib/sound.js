// ---------------------------------------------------------------------------
// Sound: synthesised on the fly with WebAudio so the app ships zero audio
// assets. Deliberately toy-like — marimba-ish blips, not clinical beeps.
// ---------------------------------------------------------------------------

let ctx = null

function audioContext() {
  if (typeof window === 'undefined') return null
  const Ctor = window.AudioContext || window.webkitAudioContext
  if (!Ctor) return null
  if (!ctx) ctx = new Ctor()
  // Safari suspends the context until a gesture; every play() is triggered by
  // a tap, so this is a safe place to wake it back up.
  if (ctx.state === 'suspended') ctx.resume().catch(() => {})
  return ctx
}

function blip(ac, { freq, startAt, duration, gain = 0.16, type = 'triangle' }) {
  const osc = ac.createOscillator()
  const env = ac.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, startAt)
  env.gain.setValueAtTime(0.0001, startAt)
  env.gain.exponentialRampToValueAtTime(gain, startAt + 0.015)
  env.gain.exponentialRampToValueAtTime(0.0001, startAt + duration)
  osc.connect(env)
  env.connect(ac.destination)
  osc.start(startAt)
  osc.stop(startAt + duration + 0.05)
}

/** A little ascending "you did it!" arpeggio. */
export function playFocusComplete() {
  const ac = audioContext()
  if (!ac) return
  const t = ac.currentTime
  const notes = [523.25, 659.25, 783.99, 1046.5] // C5 E5 G5 C6
  notes.forEach((freq, i) => {
    blip(ac, { freq, startAt: t + i * 0.09, duration: 0.32, gain: 0.15 })
  })
}

/** Two soft notes to mark "step away now". */
export function playBreakStart() {
  const ac = audioContext()
  if (!ac) return
  const t = ac.currentTime
  blip(ac, { freq: 392.0, startAt: t, duration: 0.26, gain: 0.13 })
  blip(ac, { freq: 523.25, startAt: t + 0.13, duration: 0.34, gain: 0.13 })
}

/** Warm descending resolution — welcome back. */
export function playBreakDone() {
  const ac = audioContext()
  if (!ac) return
  const t = ac.currentTime
  blip(ac, { freq: 659.25, startAt: t, duration: 0.3, gain: 0.13 })
  blip(ac, { freq: 523.25, startAt: t + 0.14, duration: 0.3, gain: 0.12 })
  blip(ac, { freq: 392.0, startAt: t + 0.28, duration: 0.5, gain: 0.12 })
}

export const sfx = {
  focusComplete: playFocusComplete,
  breakStart: playBreakStart,
  breakDone: playBreakDone,
}
