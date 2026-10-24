import { useGame } from '@/store/game'
import { Header, Footer, useRankTitle } from './Chrome'
import { FACTORS, FactorKey, PILOTS, PILOT_HEADGEAR } from '@/config/game'
import { audio } from '@/game/audio'
import Showcase from '@/game/Showcase'

export default function Pilot() {
  const { profile, updateProfile, randomCallsign, setScreen } = useGame()
  const rank = useRankTitle()
  const pilot = PILOTS.find(p => p.key === profile.pilotKey) ?? PILOTS[0]
  const gear = PILOT_HEADGEAR.find(h => h.key === profile.headgearKey) ?? PILOT_HEADGEAR[0]
  const bonus = ('bonus' in gear ? gear.bonus : {}) as Partial<Record<FactorKey, number>>
  return (
    <div className="view">
      <Header />
      <div className="custom">
        <div className="custom__preview" style={{ background: `radial-gradient(circle at 50% 40%, ${pilot.color}55, var(--bg) 70%)` }}>
          <div className="rig-preview"><Showcase focus="pilot" /></div>
          <div style={{ position: 'absolute', bottom: 20, left: 24 }} className="eyebrow">{rank} · Level {profile.level}</div>
        </div>
        <div className="custom__panel">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h2 className="display" style={{ fontSize: 36, margin: 0 }}>Pilot</h2>
            <button className="btn btn--sm" onClick={() => { audio.play('click'); setScreen('menu') }}>Done</button>
          </div>
          <div className="settings-group__title">Callsign</div>
          <div className="field">
            <input value={profile.callsign} maxLength={18} onChange={e => updateProfile({ callsign: e.target.value.replace(/[^\w\s-]/g, '').slice(0, 18) })} />
            <button className="btn btn--ghost btn--sm" onClick={() => { audio.play('click'); randomCallsign() }}>Random</button>
          </div>
          <div className="settings-group__title">Theme</div>
          <div className="swatches">{PILOTS.map(p => <button key={p.key} className={`swatch ${profile.pilotKey === p.key ? 'active' : ''}`} style={{ background: `radial-gradient(circle at 35% 30%, ${p.skin}, ${p.color})` }} aria-label={p.label} title={p.label} onClick={() => { audio.play('click'); updateProfile({ pilotKey: p.key }) }} />)}</div>
          <div className="settings-group__title">Headgear</div>
          <div className="option-grid">{PILOT_HEADGEAR.map(h => <button key={h.key} className={`option ${profile.headgearKey === h.key ? 'active' : ''}`} onClick={() => { audio.play('click'); updateProfile({ headgearKey: h.key }) }}><div className="option__title">{h.label}</div><div className="option__sub">{'bonus' in h ? Object.entries(h.bonus).map(([k, v]) => `${k} ${v > 0 ? '+' : ''}${v}`).join(' · ') : 'No stat changes'}</div></button>)}</div>
          <div className="settings-group__title">Base factors</div>
          <div className="card">
            {FACTORS.map(f => { const v = Math.max(0, Math.min(100, pilot.base[f.key] + (bonus[f.key] ?? 0))); return <div key={f.key} className="stat"><span>{f.label}</span><span className="stat__bar"><span className="stat__fill" style={{ width: `${v}%`, background: pilot.color }} /></span><b>{v}</b></div> })}
            <p className="muted" style={{ fontSize: 12, margin: '10px 0 0' }}>Base factors seed 60% of each performance factor; the rest you earn during the run.</p>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  )
}
