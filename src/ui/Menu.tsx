import { useEffect, useMemo, useState } from 'react'
import { useGame } from '@/store/game'
import { Header, Footer, useRankTitle } from './Chrome'
import { Avatar, Icon } from './icons'
import { FACTORS, FACTOR_NICKNAMES, LEX, PILOTS, RIGS, xpForLevel } from '@/config/game'
import { audio } from '@/game/audio'
import Showcase from '@/game/Showcase'

export const fmt = (n: number) => n.toLocaleString('en-US').replace(/,/g, ' ')
export const fmtTime = (ms: number) => { const s = Math.round(ms / 1000); return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}` }
export const nickname = (v: number) => FACTOR_NICKNAMES[Math.min(FACTOR_NICKNAMES.length - 1, Math.floor(v / 100 * FACTOR_NICKNAMES.length))]

export function ResultsPreview() {
  const { lastRun, bestRun, profile, clearResults, setModal } = useGame()
  const run = lastRun ?? bestRun
  if (!run) return (
    <div className="card">
      <div className="card__head"><div className="card__title">Your best</div></div>
      <p className="muted" style={{ margin: 0 }}>Play a run to see your results here.</p>
    </div>
  )
  const diff = lastRun && bestRun && lastRun.id !== bestRun.id ? lastRun.score - bestRun.score : 0
  return (
    <div className="card">
      <div className="card__head">
        <div className="card__title">{lastRun ? 'Last run' : 'Your best'}</div>
        <button className="link-btn" onClick={() => { audio.play('click'); setModal('share') }}><Icon.share /> Share</button>
      </div>
      <div className="row row--featured"><span>{LEX.score}</span><b>{fmt(run.score)}{diff ? <span className={`tag ${diff > 0 ? 'tag--up' : 'tag--down'}`}>{diff > 0 ? '+' : ''}{fmt(diff)}</span> : null}</b></div>
      <div className="row row--featured"><span>{LEX.likes}</span><b>{fmt(run.sparks)}</b></div>
      <div className="row row--featured"><span>Level {profile.level}</span><b className="muted">({fmt(profile.xp)}/{fmt(xpForLevel(profile.level))})</b></div>
      {FACTORS.map(f => <div key={f.key} className="row"><span>{f.label} ({nickname(run.factors[f.key])})</span><b>{Math.round(run.factors[f.key])}%</b></div>)}
      <div className="row"><span>Max multiplier</span><b>x{run.maxMultiplier.toFixed(2)}</b></div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12 }}>
        <button className="link-btn" onClick={() => { audio.play('click'); clearResults() }}>⚠ Clear results</button>
        <button className="link-btn" onClick={() => { audio.play('click'); setModal('evaluation') }}><Icon.info /> Evaluation system</button>
      </div>
    </div>
  )
}

export function Leaderboard() {
  const { leaderboard, profile } = useGame()
  return (
    <div className="card">
      <div className="card__head"><div className="card__title">Leaderboard</div><span className="eyebrow">Local · top 10</span></div>
      {leaderboard.slice(0, 10).map((e, i) => {
        const pilot = PILOTS.find(p => p.key === e.pilotKey) ?? PILOTS[0]
        return (
          <div key={e.id} className={`lb-row ${e.id === 'you-best' ? 'lb-row--you' : ''}`}>
            <span className={`lb-rank ${i < 3 ? 'lb-rank--top' : ''}`}>{i < 3 ? ['①', '②', '③'][i] : i + 1}</span>
            <Avatar color={pilot.color} skin={pilot.skin} size={36} />
            <span className="lb-name">{e.id === 'you-best' ? profile.callsign : e.name}{e.team && <small>{e.team}</small>}</span>
            <span className="lb-score">{fmt(e.score)}</span>
          </div>
        )
      })}
    </div>
  )
}

export default function Menu() {
  const { profile, setScreen, setModal } = useGame()
  const rank = useRankTitle()
  const pilot = PILOTS.find(p => p.key === profile.pilotKey) ?? PILOTS[0]
  const rig = RIGS.find(r => r.key === profile.rigKey) ?? RIGS[0]
  const paint = rig.paints.find(p => p.key === profile.paintKey) ?? rig.paints[0]
  const [online] = useState(() => 8 + Math.floor(Math.random() * 20))
  const totalRacers = useMemo(() => 10263 + profile.runs, [profile.runs])
  const play = () => { audio.play('click'); setScreen('race') }
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.code === 'Enter' && !useGame.getState().modal) play() }
    window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h)
  })
  return (
    <div className="view">
      <Header />
      <div className="menu__scene"><Showcase focus="menu" /></div>
      <div className="menu">
        <div className="menu__bg" />
        <div className="menu__left">
          <div className="online">
            <span className="pill"><span className="dot" /><b>{online}</b> online</span>
            <span className="pill"><b>{fmt(totalRacers)}</b> total pilots</span>
          </div>
          <div className="big-actions">
            <button className="big-btn big-btn--outline" onClick={() => { audio.play('click'); setModal('howto') }}>Howto</button>
            <button className="big-btn" onClick={play}>Play <span className="big-btn__key">⏎</span></button>
          </div>
          <div className="profile-row">
            <button className="profile-chip" onClick={() => { audio.play('click'); setScreen('pilot') }}>
              <Avatar color={pilot.color} skin={pilot.skin} />
              <span><span className="profile-chip__title">{profile.callsign}</span><span className="profile-chip__sub">{rank} · Lvl {profile.level}</span></span>
            </button>
            <button className="profile-chip" onClick={() => { audio.play('click'); setScreen('garage') }}>
              <span className="profile-chip__img" style={{ background: `linear-gradient(135deg, ${paint.body}, ${paint.trim})` }}><span style={{ width: 28, height: 14, borderRadius: 4, background: '#0a0a0a' }} /></span>
              <span><span className="profile-chip__title">{rig.name}</span><span className="profile-chip__sub">{paint.key}</span></span>
            </button>
          </div>
          <div className="version">v0.3.0 · 2026-10-17 <button onClick={() => { audio.play('click'); setModal('updates') }}>Build details</button></div>
        </div>
        <div className="menu__right">
          <ResultsPreview />
          <Leaderboard />
          <p className="muted" style={{ fontSize: 12, textAlign: 'center' }}>Questions, suggestions or feedback? This is a portfolio rebuild — say hi.</p>
        </div>
      </div>
      <Footer />
    </div>
  )
}
