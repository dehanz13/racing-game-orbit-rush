import { useGame } from '@/store/game'
import { Header, Footer } from './Chrome'
import { RIGS } from '@/config/game'
import { audio } from '@/game/audio'
import Showcase from '@/game/Showcase'

export default function Garage() {
  const { profile, updateProfile, setScreen } = useGame()
  const rig = RIGS.find(r => r.key === profile.rigKey) ?? RIGS[0]
  const paint = rig.paints.find(p => p.key === profile.paintKey) ?? rig.paints[0]
  return (
    <div className="view">
      <Header />
      <div className="custom">
        <div className="custom__preview" style={{ background: `radial-gradient(circle at 50% 60%, ${paint.body}44, var(--bg) 70%)` }}>
          <div className="rig-preview"><Showcase focus="car" /></div>
          <div style={{ position: 'absolute', bottom: 20, left: 24 }}><div className="display" style={{ fontSize: 28 }}>{paint.label}</div><div className="muted" style={{ fontSize: 13 }}>{rig.tagline}</div></div>
        </div>
        <div className="custom__panel">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h2 className="display" style={{ fontSize: 36, margin: 0 }}>Garage</h2>
            <button className="btn btn--sm" onClick={() => { audio.play('click'); setScreen('menu') }}>Done</button>
          </div>
          <div className="settings-group__title">Rig</div>
          <div className="option-grid">{RIGS.map(r => <button key={r.key} className={`option ${profile.rigKey === r.key ? 'active' : ''}`} onClick={() => { audio.play('click'); updateProfile({ rigKey: r.key, paintKey: r.paints[0].key }) }}><div className="option__title">{r.name}</div><div className="option__sub">{r.tagline}</div></button>)}</div>
          <div className="settings-group__title">Paint</div>
          <div className="swatches">{rig.paints.map(p => <button key={p.key} className={`swatch ${profile.paintKey === p.key ? 'active' : ''}`} style={{ background: `linear-gradient(135deg, ${p.body}, ${p.trim})` }} title={p.label} aria-label={p.label} onClick={() => { audio.play('click'); updateProfile({ paintKey: p.key }) }} />)}</div>
          <div className="settings-group__title">Stats</div>
          <div className="card">
            {([['Speed', rig.stats.speed], ['Grip', rig.stats.grip], ['Hull', rig.stats.hull]] as const).map(([k, v]) => <div key={k} className="stat"><span>{k}</span><span className="stat__bar"><span className="stat__fill" style={{ width: `${Math.round((v - 0.6) / 0.9 * 100)}%`, background: paint.glow }} /></span><b>{Math.round(v * 100)}</b></div>)}
          </div>
        </div>
      </div>
      <Footer />
    </div>
  )
}
