import { Modal } from './Chrome'
import { useGame } from '@/store/game'
import { audio } from '@/game/audio'

const quality = [
  { key: 'eco', title: 'Eco quality', text: 'No shadows, soft image, simplified glow. Best performance on older devices.' },
  { key: 'medium', title: 'Medium quality', text: 'Shadows with lower detail. Smooth and stable gameplay.' },
  { key: 'high', title: 'High quality', text: 'Full shadows, crisp image and quality glow. Best for powerful hardware.' },
] as const

export default function Settings({ onClose }: { onClose: () => void }) {
  const { settings, updateSettings } = useGame()
  const set = (p: Partial<typeof settings>) => { audio.play('click'); updateSettings(p) }
  return (
    <Modal onClose={onClose}>
      <h2>Settings</h2>
      <div className="settings-group">
        <div className="settings-group__title">Graphics</div>
        <div className="radio-list" style={{ flexDirection: 'column' }}>
          {quality.map(q => <button key={q.key} className={`radio ${settings.quality === q.key ? 'active' : ''}`} onClick={() => set({ quality: q.key })}>{q.title}<small>{q.text}</small></button>)}
        </div>
      </div>
      <div className="settings-group">
        <div className="settings-group__title">Frame rate</div>
        <div className="radio-list">{([60, 30, 0] as const).map(f => <button key={f} className={`radio ${settings.fpsCap === f ? 'active' : ''}`} onClick={() => set({ fpsCap: f })}>{f === 0 ? 'Max' : f}</button>)}</div>
      </div>
      <div className="settings-group">
        <div className="settings-group__title">Camera</div>
        <div className="radio-list">{(['auto', 'side', 'follow'] as const).map(c => <button key={c} className={`radio ${settings.camera === c ? 'active' : ''}`} onClick={() => set({ camera: c })}>{c}</button>)}</div>
        <p className="muted" style={{ fontSize: 12, margin: '8px 0 0' }}>Auto alternates between the side view and the chase camera as you change stages.</p>
      </div>
      <div className="settings-group">
        <div className="settings-group__title">Lighting</div>
        <div className="radio-list">{(['auto', 'day', 'night'] as const).map(c => <button key={c} className={`radio ${settings.nightMode === c ? 'active' : ''}`} onClick={() => set({ nightMode: c })}>{c}</button>)}</div>
      </div>
      <div className="settings-group">
        <div className="settings-group__title">Controls</div>
        <div className="radio-list">{(['arrows', 'wasd'] as const).map(c => <button key={c} className={`radio ${settings.controls === c ? 'active' : ''}`} onClick={() => set({ controls: c })}>{c === 'arrows' ? 'Arrows + F / E / Shift' : 'WASD + J / K / L'}</button>)}</div>
        <p className="muted" style={{ fontSize: 12, margin: '8px 0 0' }}>Both schemes are always active; this only changes the on-screen hints.</p>
      </div>
      <div className="settings-group">
        <div className="toggle">Sound effects<button className={`switch ${settings.sound ? 'on' : ''}`} aria-label="Toggle sound" onClick={() => { const v = !settings.sound; set({ sound: v }); audio.init(); audio.setEnabled(v) }} /></div>
        <div className="toggle">Music<button className={`switch ${settings.music ? 'on' : ''}`} aria-label="Toggle music" onClick={() => { const v = !settings.music; set({ music: v }); audio.init(); audio.setMusic(v); if (v) audio.startMusic() }} /></div>
      </div>
    </Modal>
  )
}
