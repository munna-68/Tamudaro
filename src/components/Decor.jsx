import { motion } from 'framer-motion'

const BLOBS = [
  { top: '6%', left: '-8%', size: 150, color: '#FFD98E', delay: 0 },
  { top: '22%', right: '-10%', size: 120, color: '#A8E86B', delay: 0.8 },
  { bottom: '18%', left: '-6%', size: 110, color: '#FFB3C7', delay: 1.6 },
  { bottom: '4%', right: '-4%', size: 140, color: '#9BD9FF', delay: 2.2 },
]

const SHAPES = [
  { top: '13%', right: '16%', rotate: 18, kind: 'star' },
  { top: '34%', left: '8%', rotate: -12, kind: 'squiggle' },
  { bottom: '26%', right: '12%', rotate: 8, kind: 'star' },
  { bottom: '8%', left: '18%', rotate: -20, kind: 'squiggle' },
]

function Star() {
  return (
    <svg viewBox="0 0 40 40" width="30" height="30">
      <path
        d="M20 2 L25.5 14 L38 15.5 L28.5 24 L31.5 37 L20 30.5 L8.5 37 L11.5 24 L2 15.5 L14.5 14 Z"
        fill="#FFC800"
        stroke="#24244A"
        strokeWidth="3"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function Squiggle() {
  return (
    <svg viewBox="0 0 48 32" width="38" height="26">
      <path
        d="M3 22 Q 12 4 21 22 T 39 22 Q 44 14 45 8"
        fill="none"
        stroke="#B266FF"
        strokeWidth="5"
        strokeLinecap="round"
      />
    </svg>
  )
}

/** Floating background junk. Purely decorative, hidden from AT. */
export default function Decor() {
  return (
    <div className="decor" aria-hidden="true">
      {BLOBS.map((b, i) => (
        <motion.span
          key={i}
          className="decor__blob"
          style={{
            top: b.top,
            left: b.left,
            right: b.right,
            bottom: b.bottom,
            width: b.size,
            height: b.size,
            background: b.color,
          }}
          animate={{ y: [0, -18, 0], scale: [1, 1.06, 1] }}
          transition={{ duration: 9 + i, repeat: Infinity, ease: 'easeInOut', delay: b.delay }}
        />
      ))}
      {SHAPES.map((s, i) => (
        <motion.span
          key={`s-${i}`}
          className="decor__shape"
          style={{ top: s.top, left: s.left, right: s.right, bottom: s.bottom }}
          animate={{ y: [0, -14, 0], rotate: [s.rotate, s.rotate + 16, s.rotate] }}
          transition={{ duration: 7 + i * 1.4, repeat: Infinity, ease: 'easeInOut', delay: i * 0.5 }}
        >
          {s.kind === 'star' ? <Star /> : <Squiggle />}
        </motion.span>
      ))}
    </div>
  )
}
