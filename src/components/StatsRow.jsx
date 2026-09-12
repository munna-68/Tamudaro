import { motion } from 'framer-motion'
import { formatMinutes } from '../lib/time'

function Bubble({ tone, emoji, value, label, delay = 0 }) {
  return (
    <motion.div
      className={`bubble bubble--${tone}`}
      initial={{ scale: 0.6, opacity: 0, y: 12 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 420, damping: 20, delay }}
    >
      <span className="bubble__emoji" aria-hidden="true">
        {emoji}
      </span>
      <motion.span
        key={value}
        className="bubble__value"
        initial={{ scale: 1.5, y: -6 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 600, damping: 18 }}
      >
        {value}
      </motion.span>
      <span className="bubble__label">{label}</span>
    </motion.div>
  )
}

/** Today's tally, right under the ring. */
export default function StatsRow({ stats }) {
  return (
    <div className="stats">
      <Bubble tone="green" emoji="✅" value={stats.focusCount} label="focus" delay={0} />
      <Bubble tone="red" emoji="🫧" value={stats.breakCount} label="breaks" delay={0.05} />
      <Bubble
        tone="yellow"
        emoji="⏳"
        value={formatMinutes(stats.totalFocusMs / 60000)}
        label="focused"
        delay={0.1}
      />
    </div>
  )
}
