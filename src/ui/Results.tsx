import { useEffect } from 'react'
import { useGame } from '@/store/game'
import { Header, Footer } from './Chrome'
import { FACTORS, LEX, xpForLevel } from '@/config/game'
import { fmt, fmtTime, nickname } from './Menu'
import { audio } from '@/game/audio'

export default function Results() {
  const { lastRun: run, bestRun, profile, setScreen } = useGame()
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.code === 'KeyR') setScreen('race'); if (e.code === 'Escape') setScreen('menu') }
    window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h)
  }, [setScreen])
  if (!run) return null
  const isBest = bestRun?.id === run.id
  return (
    <div className="view">
      <Header onBack={() => setScreen('menu')} />
      <div className="results">
        <h1 className="results__title display">Run report</h1>
        <div className="results__cols">
          <div className="results__col">
            <h3>Score</h3>
            <div className="results__featured">
              <div className="row"><span>{LEX.score}</span><b>{fmt(run.score)}{isBest && profile.runs > 1 && <span className="tag tag--new">NEW BEST</span>}</b></div>
              <div className="row"><span>{LEX.likes}</span><b>{fmt(run.sparks)}</b></div>
              <div className="row"><span>Level {profile.level}</span><b className="muted">({fmt(profile.xp)}/{fmt(xpForLevel(profile.level))})</b></div>
            </div>
            {FACTORS.map(f => <div key={f.key} className="row"><span>{f.label} ({nickname(run.factors[f.key])})</span><b>{Math.round(run.factors[f.key])}%</b></div>)}
            <div className="row"><span>Max multiplier</span><b>x{run.maxMultiplier.toFixed(2)}</b></div>
          </div>
          <div className="results__col">
            <h3>Stats</h3>
            <div className="row"><span>{LEX.nominations}</span><b>{run.beacons}</b></div>
            <div className="row"><span>{LEX.awards}</span><b>{run.constellations}</b></div>
            <div className="row"><span>{LEX.rivals} defeated</span><b>{run.drones}</b></div>
            <div className="row"><span>{LEX.bosses} defeated</span><b>{run.titans}</b></div>
            <div className="row"><span>Distance</span><b>{fmt(run.distance)} m</b></div>
            <div className="row"><span>Duration</span><b>{fmtTime(run.durationMs)} mins</b></div>
          </div>
        </div>
        <div className="results__actions">
          <button className="text-btn" onClick={() => { audio.play('click'); setScreen('menu') }}>Main menu <span className="key-btn__key">ESC</span></button>
          <button className="text-btn" onClick={() => { audio.play('click'); setScreen('race') }}>Play again <span className="key-btn__key">R</span></button>
        </div>
      </div>
      <Footer showLegend={false} />
    </div>
  )
}
