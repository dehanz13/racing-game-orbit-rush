import { useEffect, useState } from 'react'
import Scene from '@/game/Scene'
import Hud from './Hud'
import { Header, Footer } from './Chrome'
import { endSession, startSession } from '@/game/session'
import { useGame } from '@/store/game'
import { audio } from '@/game/audio'

/** Pixel-grid preloader wipe (the original fades a tile grid away). */
function Wipe() {
  const [out, setOut] = useState(false)
  useEffect(() => { const t = setTimeout(() => setOut(true), 150); return () => clearTimeout(t) }, [])
  const cells = Array.from({ length: 18 * 12 })
  return <div className={`preloader ${out ? 'preloader--out' : ''}`} aria-hidden>{cells.map((_, i) => <div key={i} className="preloader__cell" style={{ transitionDelay: `${Math.hypot((i % 18) - 9, Math.floor(i / 18) - 6) * 45}ms` }} />)}</div>
}

export default function RaceScreen() {
  const { profile, recordRun, setScreen } = useGame()
  const [ready, setReady] = useState(false)
  useEffect(() => {
    const engine = startSession({ rigKey: profile.rigKey, paintKey: profile.paintKey, pilotKey: profile.pilotKey, headgearKey: profile.headgearKey, callsign: profile.callsign })
    engine.onEnd = (r) => { recordRun(r); endSession(); setScreen('results') }
    audio.init(); audio.resume()
    setReady(true)
    return () => { endSession() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return (
    <div className="view">
      <div className="canvas-wrap">{ready && <Scene />}</div>
      <Header onBack={() => setScreen('menu')} />
      {ready && <Hud />}
      <Footer gameplay />
      <Wipe />
    </div>
  )
}
