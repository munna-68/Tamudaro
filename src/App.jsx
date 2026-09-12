import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import Decor from './components/Decor'
import ModeTabs from './components/ModeTabs'
import FocusPanel from './components/FocusPanel'
import BreakForm from './components/BreakForm'
import BreakPanel from './components/BreakPanel'
import StatsRow from './components/StatsRow'
import SummarySheet from './components/SummarySheet'
import { useFocusTimer } from './hooks/useFocusTimer'
import { useBreakTimer } from './hooks/useBreakTimer'
import { useTodayLog } from './hooks/useTodayLog'
import { LAP_MS } from './lib/time'
import { sfx } from './lib/sound'
import { celebrateFocusLap, celebrateBreakStart, celebrateBreakDone } from './lib/celebrate'

export default function App() {
  const [mode, setMode] = useState('focus')
  const [celebrate, setCelebrate] = useState(null)
  const [sheetOpen, setSheetOpen] = useState(false)

  const { today, day, stats, settings, setSoundOn, addFocusSession, addBreak, clearToday } =
    useTodayLog()

  const soundRef = useRef(settings.soundOn)
  useEffect(() => {
    soundRef.current = settings.soundOn
  }, [settings.soundOn])

  // --- celebrations -------------------------------------------------------
  const celebrateTimer = useRef(0)
  const fireCelebration = useCallback((type) => {
    window.clearTimeout(celebrateTimer.current)
    setCelebrate({ id: `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, type })
    celebrateTimer.current = window.setTimeout(
      () => setCelebrate(null),
      type === 'focus' ? 1360 : 980,
    )
  }, [])

  useEffect(() => () => window.clearTimeout(celebrateTimer.current), [])

  // --- break timer --------------------------------------------------------
  const resumeFocusAfterBreak = useRef(false)

  const handleBreakComplete = useCallback(
    ({ run, endedEarly, actualSec }) => {
      addBreak({
        reason: run.reason,
        plannedSec: run.plannedSec,
        actualSec,
        startedAt: run.startedAt,
        endedAt: Date.now(),
        endedEarly,
      })
      fireCelebration('breakDone')
      if (soundRef.current) sfx.breakDone()
      celebrateBreakDone()

      // Hand them straight back to focus, resuming the stopwatch if it was
      // running when they stepped away.
      window.setTimeout(() => {
        setMode('focus')
        if (resumeFocusAfterBreak.current) {
          resumeFocusAfterBreak.current = false
          focusTimerRef.current?.start()
        }
      }, endedEarly ? 120 : 620)
    },
    [addBreak, fireCelebration],
  )

  const breakTimer = useBreakTimer({ onComplete: handleBreakComplete })

  // --- focus timer --------------------------------------------------------
  const handleLapComplete = useCallback(
    ({ lapNumber, at, elapsedMsAtLap }) => {
      addFocusSession({
        lapNumber,
        endedAt: at,
        lapMs: LAP_MS,
        focusMsAtLapEnd: elapsedMsAtLap,
      })
      fireCelebration('focus')
      if (soundRef.current) sfx.focusComplete()
      celebrateFocusLap()
    },
    [addFocusSession, fireCelebration],
  )

  const focusTimer = useFocusTimer({ onLapComplete: handleLapComplete })

  // Late-bound ref so the break-completion callback can resume focus without
  // a circular dependency between the two hooks.
  const focusTimerRef = useRef(focusTimer)
  useEffect(() => {
    focusTimerRef.current = focusTimer
  }, [focusTimer])

  // Local midnight rolled over — move the lap baseline so yesterday's laps
  // aren't re-banked into the new, empty day.
  useEffect(() => {
    focusTimer.rolloverDay()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [today])

  const startBreak = useCallback(
    ({ reason, minutes }) => {
      resumeFocusAfterBreak.current = focusTimerRef.current?.running ?? false
      if (focusTimerRef.current?.running) focusTimerRef.current.pause()
      breakTimer.start({ reason, minutes })
      fireCelebration('breakStart')
      if (soundRef.current) sfx.breakStart()
      celebrateBreakStart()
    },
    [breakTimer, fireCelebration],
  )

  const cancelBreak = useCallback(() => {
    setMode('focus')
    if (resumeFocusAfterBreak.current) {
      resumeFocusAfterBreak.current = false
      focusTimerRef.current?.start()
    }
  }, [])

  const endBreakEarly = useCallback(() => {
    breakTimer.endEarly()
  }, [breakTimer])

  const tabsLocked = breakTimer.active

  const openSummary = useCallback(() => {
    setSheetOpen(true)
  }, [])

  return (
    <div className="app">
      <Decor />

      <header className="topbar">
        <div className="brand">
          <motion.span
            className="brand__mascot"
            animate={{ rotate: [0, -8, 8, 0], scale: [1, 1.06, 1] }}
            transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
            aria-hidden="true"
          >
            🌀
          </motion.span>
          <div className="brand__text">
            <motion.h1
              animate={{ y: [0, -1.5, 0] }}
              transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
            >
              Tanudaro
            </motion.h1>
            <p>count-up focus timer</p>
          </div>
        </div>

        <div className="topbar__actions">
          <button
            type="button"
            className="icon-btn"
            onClick={() => setSoundOn(!settings.soundOn)}
            aria-label={settings.soundOn ? 'Mute sounds' : 'Unmute sounds'}
            title={settings.soundOn ? 'Mute sounds' : 'Unmute sounds'}
          >
            {settings.soundOn ? '🔊' : '🔇'}
          </button>
          <motion.button
            type="button"
            className="icon-btn icon-btn--summary"
            onClick={openSummary}
            whileTap={{ scale: 0.92, y: 3 }}
            aria-label={`Today: ${stats.focusCount} focus sessions, ${stats.breakCount} breaks`}
          >
            📋
            <AnimatePresence>
              {(stats.focusCount > 0 || stats.breakCount > 0) && (
                <motion.span
                  className="icon-btn__badge"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  transition={{ type: 'spring', stiffness: 600, damping: 18 }}
                >
                  {stats.focusCount + stats.breakCount}
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>
        </div>
      </header>

      <main className="stage">
        <ModeTabs mode={mode} onChange={setMode} disabled={tabsLocked} />

        <AnimatePresence mode="wait">
          {mode === 'focus' ? (
            <FocusPanel
              key="focus"
              timer={focusTimer}
              celebrate={celebrate?.type === 'focus' ? celebrate : null}
              onTakeBreak={() => setMode('break')}
            />
          ) : breakTimer.active ? (
            <BreakPanel
              key="break-active"
              breakTimer={breakTimer}
              celebrate={celebrate?.type === 'breakStart' ? celebrate : null}
              onEndEarly={endBreakEarly}
            />
          ) : (
            <BreakForm key="break-form" onStart={startBreak} onCancel={cancelBreak} />
          )}
        </AnimatePresence>

        <StatsRow stats={stats} />
      </main>

      <SummarySheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        stats={stats}
        day={day}
        today={today}
        onClear={() => {
          clearToday()
          setSheetOpen(false)
        }}
      />
    </div>
  )
}
