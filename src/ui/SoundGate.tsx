import { useEffect } from 'react'
import { useGame } from '@/store/game'
import { audio } from '@/game/audio'
import { LEX } from '@/config/game'

/** First screen: the original asks "Sound?" with ESC = off, Enter = on. */
export default function SoundGate() {
  const { setScreen, updateSettings } = useGame()
  const choose = (on: boolean) => {
    audio.init(); audio.resume(); audio.setEnabled(on); audio.setMusic(on)
    updateSettings({ sound: on, music: on })
    if (on) { audio.play('click'); audio.startMusic() }
    setScreen('menu')
  }
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.code === 'Enter') choose(true); if (e.code === 'Escape') choose(false) }
    window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h)
  })
  return (
    <div className="gate">
      <div className="gate__orb" />
      <h1 className="gate__title display">Sound<em>?</em></h1>
      <div className="gate__actions">
        <button className="key-btn" onClick={() => choose(false)}><span className="key-btn__key">ESC</span>Off</button>
        <button className="key-btn" onClick={() => choose(true)}><span className="key-btn__key">⏎</span>On</button>
      </div>
      <div className="eyebrow" style={{ position: 'absolute', top: 24 }}>{LEX.game}</div>
    </div>
  )
}
