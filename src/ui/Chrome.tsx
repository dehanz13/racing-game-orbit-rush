import { useEffect, useState } from 'react'
import { useGame, selectRankTitle } from '@/store/game'
import { Icon } from './icons'
import { audio } from '@/game/audio'
import { KEYS, LEX } from '@/config/game'
import { perf } from '@/game/perf'

export function Header({ onBack }: { onBack?: () => void }) {
  const { screen, setModal, setScreen } = useGame()
  const [menu, setMenu] = useState(false)
  const home = screen === 'menu'
  return (
    <header className="chrome-header">
      <button className="logo" onClick={() => { audio.play('click'); onBack ? onBack() : setScreen('menu') }} aria-label="Home">
        <span>Orbit</span><span>Rush ✦</span>
      </button>
      {home && (
        <div className="badges" aria-hidden>
          {[['✦', 'Arcade'], ['⌁', 'Browser'], ['∞', 'Endless']].map(([i, b]) => <div key={b} className="badge"><span className="badge__ring">{i}</span>{b}</div>)}
        </div>
      )}
      <div className="icon-row" style={{ position: 'relative' }}>
        {!home && <button className="icon-btn" aria-label="Back" onClick={() => { audio.play('click'); onBack ? onBack() : setScreen('menu') }}><Icon.close /></button>}
        <button className="icon-btn" aria-label="Share" onClick={() => { audio.play('click'); setModal('share') }}><Icon.share /></button>
        {home && <button className="icon-btn" aria-label="Menu" onClick={() => { audio.play('click'); setMenu(m => !m) }}><Icon.menu /></button>}
        {menu && (
          <div className="card" style={{ position: 'absolute', right: 0, top: 56, width: 220, display: 'flex', flexDirection: 'column', gap: 4 }}>
            {[['About', () => setScreen('about')], ['Updates', () => setModal('updates')], ['Evaluation', () => setModal('evaluation')], ['Settings', () => setModal('settings')]].map(([label, fn]) => (
              <button key={label as string} className="row" style={{ justifyContent: 'flex-start' }} onClick={() => { audio.play('click'); setMenu(false); (fn as () => void)() }}>{label as string}</button>
            ))}
          </div>
        )}
      </div>
    </header>
  )
}

export function Footer({ gameplay = false, showLegend = true }: { gameplay?: boolean; showLegend?: boolean }) {
  const { settings, updateSettings, setModal, setScreen } = useGame()
  const [fps, setFps] = useState(60)
  useEffect(() => {
    // In a race we count frames the 3D loop actually rendered; elsewhere, raw rAF ticks.
    let frames = 0, last = performance.now(), lastRendered = perf.frames, raf = 0
    const tick = (t: number) => {
      frames++
      if (t - last > 1000) {
        const rendered = perf.frames - lastRendered
        setFps(Math.round((gameplay ? rendered : frames) * 1000 / (t - last)))
        frames = 0; lastRendered = perf.frames; last = t
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick); return () => cancelAnimationFrame(raf)
  }, [gameplay])
  const toggleSound = () => { const v = !settings.sound; updateSettings({ sound: v }); audio.init(); audio.resume(); audio.setEnabled(v); if (v) audio.play('click') }
  const toggleMusic = () => { const v = !settings.music; updateSettings({ music: v }); audio.init(); audio.resume(); audio.setMusic(v); if (v) audio.startMusic() }
  const wasd = settings.controls === 'wasd'
  const legend = [
    { label: 'Drive', keys: wasd ? 'WASD' : '↑↓←→' },
    { label: 'Fire', keys: wasd ? 'J' : 'F' }, { label: LEX.boom, keys: wasd ? 'K' : 'E' },
    { label: LEX.nitro, keys: wasd ? 'L' : 'Shift' }, { label: 'Jump', keys: 'Space' }, { label: 'Restart', keys: 'R' },
  ]
  return (
    <footer className="chrome-footer">
      <button className="pill pill--fps" onClick={() => { audio.play('click'); setModal('settings') }} aria-label="Settings">
        <span>{fps}<small>fps</small></span><Icon.gear />
      </button>
      {!gameplay && showLegend && <div className="controls-legend">{legend.map(l => <span key={l.label} className="legend-item"><kbd>{l.keys}</kbd>{l.label}</span>)}</div>}
      <div className="icon-row">
        <button className="icon-btn" aria-label="Switch control scheme" title={`Controls: ${settings.controls}`} onClick={() => { audio.play('click'); updateSettings({ controls: wasd ? 'arrows' : 'wasd' }) }}><Icon.keyboard /></button>
        {!gameplay && <button className="icon-btn" aria-label="Player" onClick={() => { audio.play('click'); setScreen('pilot') }}><Icon.user /></button>}
        <button className="icon-btn" aria-label="Music" onClick={toggleMusic} style={{ opacity: settings.music ? 1 : 0.5 }}><Icon.music /></button>
        <button className="icon-btn" aria-label={settings.sound ? 'Sound off' : 'Sound on'} onClick={toggleSound}>{settings.sound ? <Icon.sound /> : <Icon.soundOff />}</button>
      </div>
    </footer>
  )
}

export function Modal({ children, onClose, wide = false }: { children: React.ReactNode; onClose: () => void; wide?: boolean }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.code === 'Escape') onClose() }
    window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h)
  }, [onClose])
  return (
    <div className="modal" onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className={`modal__box ${wide ? 'modal__box--wide' : ''}`} style={{ position: 'relative' }}>
        <button className="icon-btn modal__close" onClick={onClose} aria-label="Close"><Icon.close /></button>
        {children}
      </div>
    </div>
  )
}

export const keyLabel = (a: keyof typeof KEYS) => KEYS[a][0].replace('Key', '').replace('Arrow', '')
export const useRankTitle = () => useGame(selectRankTitle)
