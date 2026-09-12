import { useEffect } from 'react'

// Roughly the smallest real on-screen keyboard. Anything shorter than this is
// browser chrome moving around, not a keyboard.
const KEYBOARD_MIN_PX = 120

/**
 * Publishes the *visual* viewport as CSS variables so fixed overlays can stay
 * inside the part of the page the user can actually see.
 *
 * Why this is needed: `position: fixed` is laid out against the layout
 * viewport. On iOS that box does NOT shrink when the soft keyboard opens, so
 * an overlay centred the usual way ends up parked behind the keyboard — which
 * is exactly how the "How many minutes?" card was disappearing.
 *
 * Variables (only set while a keyboard is up, so `var(--x, 100dvh)` degrades
 * to the old behaviour everywhere else):
 *   --vvh    height of the visible area
 *   --vvt    offset of the visible area from the top of the layout viewport
 *   --kb-h   how much of the layout viewport the keyboard is covering
 *   data-kb  "1" on <html> while the keyboard is up
 */
export function useVisualViewport() {
  useEffect(() => {
    const root = document.documentElement
    const vv = window.visualViewport

    const clear = () => {
      root.style.removeProperty('--vvh')
      root.style.removeProperty('--vvt')
      root.style.removeProperty('--kb-h')
      root.removeAttribute('data-kb')
    }

    if (!vv) return clear

    let raf = 0
    const apply = () => {
      raf = 0
      // On iOS `innerHeight` ignores the keyboard, so the difference is the
      // keyboard. On Android `innerHeight` shrinks with it, so the difference
      // is ~0 and we correctly stay out of the way.
      const hidden = window.innerHeight - vv.height - vv.offsetTop

      if (hidden > KEYBOARD_MIN_PX) {
        root.style.setProperty('--vvh', `${Math.round(vv.height)}px`)
        root.style.setProperty('--vvt', `${Math.round(vv.offsetTop)}px`)
        root.style.setProperty('--kb-h', `${Math.round(hidden)}px`)
        root.setAttribute('data-kb', '1')
      } else {
        clear()
      }
    }

    // visualViewport fires a burst of events while the keyboard animates in.
    // Coalesce them into one write per frame.
    const schedule = () => {
      if (!raf) raf = window.requestAnimationFrame(apply)
    }

    apply()
    vv.addEventListener('resize', schedule)
    vv.addEventListener('scroll', schedule)
    window.addEventListener('orientationchange', schedule)

    return () => {
      if (raf) window.cancelAnimationFrame(raf)
      vv.removeEventListener('resize', schedule)
      vv.removeEventListener('scroll', schedule)
      window.removeEventListener('orientationchange', schedule)
      clear()
    }
  }, [])
}
