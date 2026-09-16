import { motion } from 'framer-motion'
import { formatMinutes } from '../lib/time'

/**
 * Today's plan, as a single strip under the stats row.
 *
 * It has one job: make the plan visible *while the timer is running*, so you
 * can see what you said you'd cover and how far in you are without leaving the
 * focus screen. Everything you can actually change lives in the sheet behind
 * it — this is a readout with a tap target.
 */
export default function PlanCard({ stats, onOpen }) {
  const { total, doneCount, openCount, progress, focusMs, active } = stats
  const empty = total === 0
  const allDone = total > 0 && doneCount === total
  const pct = Math.round(progress * 100)
  const time = focusMs > 0 ? formatMinutes(focusMs / 60000) : ''

  const meta = empty
    ? 'Tap to say what you\u2019re covering today'
    : allDone
      ? `🎉 All ${total} done${time ? ` \u00b7 ${time} on them` : ''}`
      : active
        ? `▶ ${active.title}${time ? ` \u00b7 ${time} on tasks` : ''}`
        : `${openCount} left${time ? ` \u00b7 ${time} on tasks` : ''}`

  return (
    <motion.button
      type="button"
      className={`plan-card ${empty ? 'is-empty' : ''} ${allDone ? 'is-complete' : ''}`}
      onClick={onOpen}
      whileTap={{ scale: 0.985, y: 3 }}
      aria-label={
        empty
          ? 'Set up today\u2019s plan'
          : `Today\u2019s plan: ${doneCount} of ${total} tasks done, ${pct}% covered. Open to edit.`
      }
    >
      <span className="plan-card__top">
        <span className="plan-card__title">
          <span aria-hidden="true">📝</span> Today&apos;s plan
        </span>
        <span className={`plan-card__badge ${allDone ? 'is-done' : ''}`}>
          {empty ? 'set it up' : `${doneCount}/${total}`}
        </span>
        <span className="plan-card__chev" aria-hidden="true">
          ›
        </span>
      </span>

      {!empty && (
        <span className="plan-card__bar" aria-hidden="true">
          <motion.span
            className="plan-card__fill"
            initial={false}
            animate={{ width: `${pct}%` }}
            transition={{ type: 'spring', stiffness: 260, damping: 30 }}
          />
        </span>
      )}

      <span className="plan-card__meta">{meta}</span>
    </motion.button>
  )
}
