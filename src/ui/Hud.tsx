import { useEffect, useRef } from 'react'
import { useHud, getEngine } from '@/game/session'
import { input } from '@/game/input'
import { useGame } from '@/store/game'
import { CONSTELLATIONS, FACTORS, LEX } from '@/config/game'
import { Icon } from './icons'
import { audio } from '@/game/audio'

const isTouch = () => matchMedia('(pointer: coarse)').matches

function TouchControls() {
  const pad = useRef<HTMLDivElement>(null)
  const knob = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = pad.current; if (!el) return
    let active = false
    const move = (e: PointerEvent) => {
      if (!active) return
      const r = el.getBoundingClientRect()
      const dx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2), dy = (e.clientY - (r.top + r.height / 2)) / (r.height / 2)
      const len = Math.hypot(dx, dy) || 1, k = Math.min(1, len)
      input.steerAxis = Math.max(-1, Math.min(1, dx)); input.throttleAxis = Math.max(-1, Math.min(1, -dy))
      if (knob.current) knob.current.style.transform = `translate(${dx / len * k * 45}px, ${dy / len * k * 45}px)`
    }
    const up = () => { active = false; input.steerAxis = 0; input.throttleAxis = 0; if (knob.current) knob.current.style.transform = '' }
    const down = (e: PointerEvent) => { active = true; el.setPointerCapture(e.pointerId); move(e) }
    el.addEventListener('pointerdown', down); el.addEventListener('pointermove', move); el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up)
    return () => { el.removeEventListener('pointerdown', down); el.removeEventListener('pointermove', move); el.removeEventListener('pointerup', up); el.removeEventListener('pointercancel', up) }
  }, [])
  const btn = (a: Parameters<typeof input.press>[0], label: string) => (
    <button className="touch__btn" onPointerDown={e => { e.preventDefault(); input.press(a) }} onPointerUp={() => input.release(a)} onPointerCancel={() => input.release(a)} onPointerLeave={() => input.release(a)}>{label}</button>
  )
  return (
    <div className="touch">
      <div className="touch__pad" ref={pad}><div className="touch__knob" ref={knob} /></div>
      <div className="touch__btns">{btn('fire', 'Fire')}{btn('boom', 'Boom')}{btn('nitro', 'Nitro')}{btn('jump', 'Jump')}</div>
    </div>
  )
}

export default function Hud() {
  const hud = useHud(15)
  const { setScreen, modal, setModal } = useGame()
  useEffect(() => { if (hud?.palette) document.body.setAttribute('data-theme', hud.palette.ui) }, [hud?.palette.ui])
  useEffect(() => () => document.body.removeAttribute('data-theme'), [])
  // Escape = pause/exit confirm (the engine toggles paused; we mirror it as a modal)
  useEffect(() => {
    if (!hud) return
    if (hud.paused && modal !== 'exit') setModal('exit')
    if (!hud.paused && modal === 'exit') setModal(null)
  }, [hud?.paused])
  if (!hud) return null
  const resume = () => { const e = getEngine(); if (e) e.paused = false; setModal(null); audio.play('click') }
  const exit = () => { audio.play('click'); setScreen('menu') }
  const f = hud.factors
  const low = hud.timeLeft <= 15
  return (
    <div className="hud">
      <div className="hit-vignette" style={{ opacity: hud.hull < hud.maxHull * 0.25 ? 0.6 : 0 }} />
      <div className="hud__top">
        <div className="gauge" style={{ ['--pct' as any]: `${Math.min(100, (hud.multiplier - 1) / 4 * 100)}%` }}>
          <div className="gauge__inner"><small>mult.</small><b>x{hud.multiplier.toFixed(2)}</b><i>{hud.distance} m</i></div>
        </div>
        <div className="sparks"><b>{hud.sparks}</b><small>{LEX.likes}</small></div>
        <div className={`timer ${low ? 'timer--low' : ''}`}>{String(Math.floor(hud.timeLeft / 60)).padStart(2, '0')}:{String(hud.timeLeft % 60).padStart(2, '0')}</div>
      </div>
      {hud.constellations.length > 0 && (
        <div className="constellations">{hud.constellations.map(k => <span key={k} title={CONSTELLATIONS.find(c => c.key === k)?.label}>✦</span>)}</div>
      )}
      <div className="hud__left">
        <div className="ammo"><span className={`ammo__icon ${hud.shockwaves ? 'active' : ''}`} title={LEX.boom}>◎</span><span className="ammo__count"><i>x</i>{hud.shockwaves}</span></div>
        <div className="ammo"><span className={`ammo__icon ${hud.bolts ? 'active' : ''}`} title={LEX.rockets}>➶</span><span className="ammo__count"><i>x</i>{hud.bolts}</span></div>
        <div className="ammo"><span className={`ammo__icon ${hud.overdriveCharges || hud.overdriveActive ? 'active' : ''}`} title={LEX.nitro} style={hud.overdriveActive ? { background: 'var(--lime)', color: '#000' } : undefined}>⚡</span><span className="ammo__count"><i>x</i>{hud.overdriveCharges}</span></div>
      </div>
      <div className="hud__right">
        {FACTORS.map(d => <div key={d.key} className="dial"><span className="dial__ring" style={{ ['--pct' as any]: `${f[d.key]}%` }}><b>{Math.round(f[d.key])}<small style={{ fontSize: 7 }}>%</small></b></span><small>{d.label}</small></div>)}
      </div>
      <div className="hud__bottom-left">
        <div className="tracker"><b>{LEX.story}</b><small>{hud.beaconsLit}/{hud.beaconTotal} lit · {Number.isFinite(hud.nearestBeaconDist) ? `${hud.nearestBeaconDist} m` : '—'}</small></div>
        <div className="tracker"><b>{LEX.rivals}</b><small>{hud.dronesAlive} nearby</small></div>
        <div className="tracker" style={hud.relay ? { borderColor: 'var(--gold)' } : undefined}><b>{LEX.checkpointRoad}</b><small>{hud.relay ? `gate ${hud.relay.next + 1}/${hud.relay.total} · ${hud.relay.timeLeft.toFixed(0)}s` : 'light a Beacon'}</small></div>
        <div className="tracker"><b>Speed</b><small>{hud.speedDisplay} · hype {Math.round(hud.excitement * 100)}%</small></div>
      </div>
      <div className="bars">
        <div className="bar bar--hull" title={LEX.health}><div className="bar__fill" style={{ width: `${hud.hull / hud.maxHull * 100}%` }} /></div>
        <div className="bar bar--shield" title={LEX.armor}><div className="bar__fill" style={{ width: `${hud.maxShield ? hud.shield / hud.maxShield * 100 : 0}%` }} /></div>
      </div>
      {Number.isFinite(hud.nearestBeaconDist) && hud.nearestBeaconDist > 25 && (
        <div className="chevrons"><div className="chevrons__arrow" style={{ transform: `rotate(${-hud.nearestBeaconAngle}rad)` }}>⌃<small>{hud.nearestBeaconDist}m</small></div></div>
      )}
      {hud.lockTarget && <div className="lock">{hud.lockProgress >= 1 ? 'LOCKED · release to fire' : 'locking…'}</div>}
      {hud.message && <div className="message" key={hud.message.at}><b>{hud.message.text}</b>{hud.message.sub && <small>{hud.message.sub}</small>}</div>}
      <div style={{ position: 'absolute', top: 18, right: 84, pointerEvents: 'auto' }}>
        <button className="icon-btn" aria-label="Pause" onClick={() => { const e = getEngine(); if (e && !e.over) { e.paused = true } }}><Icon.pause /></button>
      </div>
      {isTouch() && <TouchControls />}
      {modal === 'exit' && (
        <div className="modal" style={{ pointerEvents: 'auto' }}>
          <div className="modal__box">
            <h2>Paused</h2>
            <p>Leave the run? All progress will be lost and you will have to start over.</p>
            <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
              <button className="btn" onClick={resume}>Resume <span className="muted" style={{ fontSize: 11 }}>ESC</span></button>
              <button className="btn btn--ghost" onClick={exit}>Exit to menu</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
