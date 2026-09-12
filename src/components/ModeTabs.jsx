import { motion } from 'framer-motion'

const TABS = [
  { id: 'focus', label: 'Focus', emoji: '🎯', tone: 'green' },
  { id: 'break', label: 'Break', emoji: '🛋️', tone: 'red' },
]

/** Chunky two-way switch. The pill slides between the halves. */
export default function ModeTabs({ mode, onChange, disabled = false }) {
  return (
    <div className="tabs" role="tablist" aria-label="Timer mode">
      {TABS.map((tab) => {
        const active = mode === tab.id
        return (
          <button
            key={tab.id}
            role="tab"
            type="button"
            aria-selected={active}
            disabled={disabled && !active}
            className={`tab ${active ? 'is-active' : ''} tab--${tab.tone}`}
            onClick={() => !disabled && onChange(tab.id)}
          >
            {active && (
              <motion.span
                layoutId="tab-pill"
                className="tab__pill"
                transition={{ type: 'spring', stiffness: 480, damping: 32 }}
              />
            )}
            <span className="tab__content">
              <motion.span
                className="tab__emoji"
                animate={active ? { scale: [1, 1.25, 1], rotate: [0, -12, 12, 0] } : { scale: 1, rotate: 0 }}
                transition={{ duration: 0.45 }}
              >
                {tab.emoji}
              </motion.span>
              {tab.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}
