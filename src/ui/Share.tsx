import { useEffect, useRef, useState } from 'react'
import { Modal, useRankTitle } from './Chrome'
import { useGame } from '@/store/game'
import { FACTORS, LEX, PILOTS, RIGS } from '@/config/game'
import { fmt } from './Menu'
import { audio } from '@/game/audio'

/** Draws a 1200x630 share card on a canvas and offers it as a PNG download. */
export default function Share({ onClose }: { onClose: () => void }) {
  const { profile, lastRun, bestRun } = useGame()
  const rank = useRankTitle()
  const run = lastRun ?? bestRun
  const canvas = useRef<HTMLCanvasElement>(null)
  const [copied, setCopied] = useState(false)
  const pilot = PILOTS.find(p => p.key === profile.pilotKey) ?? PILOTS[0]
  const rig = RIGS.find(r => r.key === profile.rigKey) ?? RIGS[0]
  const paint = rig.paints.find(p => p.key === profile.paintKey) ?? rig.paints[0]

  useEffect(() => {
    const c = canvas.current; if (!c) return
    const ctx = c.getContext('2d')!
    const W = 1200, H = 630
    const g = ctx.createLinearGradient(0, 0, W, H); g.addColorStop(0, '#0a0f2a'); g.addColorStop(1, pilot.color)
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H)
    ctx.strokeStyle = 'rgba(255,255,255,0.08)'; ctx.lineWidth = 2
    for (let x = 0; x < W; x += 60) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke() }
    for (let y = 0; y < H; y += 60) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke() }
    // pilot orb
    const r = ctx.createRadialGradient(900, 300, 20, 900, 300, 190); r.addColorStop(0, pilot.skin); r.addColorStop(1, pilot.color)
    ctx.fillStyle = r; ctx.beginPath(); ctx.arc(900, 300, 190, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = '#fff'; for (const x of [840, 950]) { ctx.beginPath(); ctx.ellipse(x, 270, 30, 40, 0, 0, Math.PI * 2); ctx.fill() }
    ctx.fillStyle = '#111'; for (const x of [846, 956]) { ctx.beginPath(); ctx.ellipse(x, 282, 14, 18, 0, 0, Math.PI * 2); ctx.fill() }
    ctx.fillStyle = '#111'; ctx.beginPath(); ctx.roundRect(860, 350, 80, 26, [0, 0, 40, 40]); ctx.fill()
    // rig
    ctx.fillStyle = paint.body; ctx.beginPath(); ctx.roundRect(700, 470, 400, 70, 16); ctx.fill()
    ctx.fillStyle = paint.trim; ctx.beginPath(); ctx.roundRect(760, 430, 250, 50, 12); ctx.fill()
    ctx.fillStyle = '#15161c'; for (const x of [770, 1030]) { ctx.beginPath(); ctx.arc(x, 545, 32, 0, Math.PI * 2); ctx.fill() }
    // text
    ctx.fillStyle = '#fff'; ctx.font = '900 34px "Archivo Black", sans-serif'; ctx.fillText(LEX.game.toUpperCase(), 60, 80)
    ctx.font = '700 22px "Space Grotesk", sans-serif'; ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.fillText(`${profile.callsign.toUpperCase()} · ${rank.toUpperCase()} · LVL ${profile.level}`, 60, 120)
    ctx.fillStyle = '#fff'; ctx.font = '900 150px "Archivo Black", sans-serif'; ctx.fillText(run ? fmt(run.score) : '—', 60, 300)
    ctx.font = '700 26px "Space Grotesk", sans-serif'; ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.fillText(LEX.score.toUpperCase(), 60, 340)
    if (run) {
      ctx.font = '700 22px "Space Grotesk", sans-serif'
      const lines = [`${fmt(run.sparks)} ${LEX.likes}`, `${run.beacons} ${LEX.nominations} · ${run.drones} ${LEX.rivals} · ${run.titans} ${LEX.bosses}`, ...FACTORS.map(f => `${f.label} ${Math.round(run.factors[f.key])}%`)]
      lines.forEach((l, i) => ctx.fillText(l, 60, 400 + i * 32))
    }
    ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.font = '700 18px "Space Grotesk", sans-serif'; ctx.fillText(paint.label.toUpperCase(), 60, 600)
  }, [profile, run, pilot, paint])

  const download = () => { audio.play('click'); const a = document.createElement('a'); a.download = `orbit-rush-${profile.callsign}.png`; a.href = canvas.current!.toDataURL('image/png'); a.click() }
  const copy = async () => {
    audio.play('click')
    const text = run ? `I scored ${fmt(run.score)} ${LEX.score} in ${LEX.game} with ${fmt(run.sparks)} ${LEX.likes}. Can you beat it?` : `I'm playing ${LEX.game}.`
    try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000) } catch { /* clipboard blocked */ }
  }
  return (
    <Modal onClose={onClose} wide>
      <h2>Share your run</h2>
      <canvas ref={canvas} width={1200} height={630} className="share-card" />
      <div style={{ display: 'flex', gap: 12, marginTop: 16, flexWrap: 'wrap' }}>
        <button className="btn" onClick={download}>Download card</button>
        <button className="btn btn--ghost" onClick={copy}>{copied ? 'Copied! Paste it anywhere' : 'Copy text'}</button>
      </div>
    </Modal>
  )
}
