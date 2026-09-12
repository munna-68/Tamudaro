import { motion } from 'framer-motion'

/**
 * The house button: thick outline, hard offset shadow, squashes when you press
 * it. `tone` picks the palette; everything else is layout.
 */
export default function ChunkyButton({
  children,
  onClick,
  tone = 'green',
  size = 'lg',
  disabled = false,
  full = false,
  wiggle = false,
  type = 'button',
  ...rest
}) {
  const className = [
    'chunky',
    `chunky--${tone}`,
    `chunky--${size}`,
    full ? 'chunky--full' : '',
    disabled ? 'is-disabled' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <motion.button
      type={type}
      className={className}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      whileTap={disabled ? undefined : { y: 5, scale: 0.97 }}
      animate={
        wiggle && !disabled
          ? { rotate: [0, -1.4, 1.4, -0.8, 0], y: [0, -2, 0] }
          : { rotate: 0, y: 0 }
      }
      transition={
        wiggle && !disabled
          ? { duration: 2.6, repeat: Infinity, ease: 'easeInOut', repeatDelay: 0.6 }
          : { type: 'spring', stiffness: 600, damping: 30 }
      }
      {...rest}
    >
      <span className="chunky__label">{children}</span>
    </motion.button>
  )
}
