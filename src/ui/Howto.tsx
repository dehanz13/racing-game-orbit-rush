import { useState } from 'react'
import { Modal } from './Chrome'
import { Icon } from './icons'
import { LEX, WEAPONS } from '@/config/game'
import { audio } from '@/game/audio'

const slides = [
  {
    title: `${LEX.nominations}`,
    viz: <div style={{ display: 'flex', gap: 14 }}>{[1, 2, 3, 4, 5].map(n => <div key={n} style={{ width: 36, height: 90 + n * 14, borderRadius: 8, background: `linear-gradient(180deg, var(--accent), transparent)`, opacity: 0.35 + n * 0.13, display: 'grid', placeItems: 'start center', fontFamily: 'var(--display)', paddingTop: 8 }}>{n}</div>)}</div>,
    body: <>
      <p><strong>Light {LEX.nominations}</strong> — they are one of the biggest factors behind your <strong>{LEX.score} bonus</strong>.</p>
      <p>The higher the Beacon number, the greater its impact on your final score. Later Beacons matter most if you want to max out your points. Follow the gold chevrons.</p>
      <p>Each lit Beacon also drops a <strong>{LEX.present}</strong> with a <strong>Score Multiplier</strong>, and opens a <strong>{LEX.checkpointRoad}</strong> ahead of you.</p>
      <p><strong>More Beacons → higher multipliers → bigger {LEX.score}.</strong></p>
    </>,
  },
  {
    title: 'Shooting',
    viz: <div style={{ display: 'flex', gap: 30, alignItems: 'center' }}><div style={{ width: 70, height: 70, background: 'var(--accent)', clipPath: 'polygon(50% 0, 100% 50%, 50% 100%, 0 50%)' }} /><div style={{ width: 120, height: 4, background: 'linear-gradient(90deg, transparent, #fff)' }} /><div style={{ width: 60, height: 60, background: '#ff3d6f', clipPath: 'polygon(50% 0, 100% 50%, 50% 100%, 0 50%)', boxShadow: '0 0 30px #ff3d6f' }} /></div>,
    body: <>
      <p><strong>Every {WEAPONS.boltsPerSparks.every} {LEX.likes} earn you {WEAPONS.boltsPerSparks.grant} {LEX.rockets}.</strong></p>
      <p>Tap fire to shoot straight ahead, or <strong>hold the fire button to lock onto a {LEX.rival}</strong>. Once the target ring closes, release and the Bolt does the rest.</p>
      <p>Take down a <strong>{LEX.boss}</strong> to get a <strong>{LEX.trophy}</strong> and a spare {LEX.boom}. Titans are much tougher than regular Drones, and they appear from Stage 2.</p>
    </>,
  },
  {
    title: 'Golden loot',
    viz: <div style={{ display: 'flex', gap: 24 }}>{[['#19e6ff', '+1'], ['#ffc63a', '+10'], ['#ff6a3d', 'x1.75']].map(([c, t]) => <div key={t} style={{ width: 80, height: 80, borderRadius: '50%', border: `10px solid ${c}`, display: 'grid', placeItems: 'center', fontFamily: 'var(--display)', boxShadow: `0 0 30px ${c}66` }}>{t}</div>)}</div>,
    body: <>
      <p>Regular <strong>{LEX.likes}</strong> are the easiest loot to grab, but the real jackpot is <strong>{LEX.goldLike}s and {LEX.trophies}</strong>.</p>
      <p>Gold Sparks are easy to spot. <strong>{LEX.trophies}</strong>, however, take a little more work: look for them inside defeated <strong>{LEX.bosses}</strong> or at the end of a <strong>{LEX.checkpointRoad}</strong>… if you can make it through all five gates in time.</p>
      <p>Finishing a {LEX.checkpointRoad} also rewards you with <strong>{LEX.health} and {LEX.armor} upgrades</strong>. Jump pads launch you for air-time hype, and {LEX.nitro} cans give you a burst of speed.</p>
    </>,
  },
]

export default function Howto({ onClose }: { onClose: () => void }) {
  const [i, setI] = useState(0)
  const go = (d: number) => { audio.play('click'); setI(v => Math.max(0, Math.min(slides.length - 1, v + d))) }
  const s = slides[i]
  return (
    <Modal onClose={onClose}>
      <div className="slides__viz">{s.viz}</div>
      <div className="slides__nav">
        <button className="icon-btn" disabled={i === 0} onClick={() => go(-1)} aria-label="Previous" style={{ opacity: i === 0 ? 0.3 : 1 }}><Icon.left /></button>
        <div className="dots">{slides.map((_, k) => <span key={k} className={k === i ? 'active' : ''} />)}</div>
        <button className="icon-btn" disabled={i === slides.length - 1} onClick={() => go(1)} aria-label="Next" style={{ opacity: i === slides.length - 1 ? 0.3 : 1 }}><Icon.right /></button>
      </div>
      <h2>{s.title}</h2>
      {s.body}
    </Modal>
  )
}
