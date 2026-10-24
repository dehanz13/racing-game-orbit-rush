import { Modal } from './Chrome'
import { FACTORS, LEX } from '@/config/game'

export function EvaluationModal({ onClose }: { onClose: () => void }) {
  return (
    <Modal onClose={onClose}>
      <h2>Evaluation system</h2>
      <p>The goal? <strong>Get {LEX.likes}. Lots of them.</strong></p>
      <p>{LEX.likes} are the heart of your score, but how you get them matters too. Your playstyle adds bonuses across four performance factors, weighted at <strong>40%, 30%, 20% and 10%</strong>. Together they shape your <strong>{LEX.score}</strong>.</p>
      <div className="card" style={{ margin: '14px 0' }}>
        {FACTORS.map(f => <div key={f.key} className="row"><span>{f.label} <span className="muted" style={{ textTransform: 'none', letterSpacing: 0, fontWeight: 400 }}>· {f.hint}</span></span><b>{Math.round(f.weight * 100)}%</b></div>)}
      </div>
      <p><strong>Pulse Score</strong> = (Sparks + 3 × Drones + 12 × Titans + 5 × Beacons) × Multiplier × (1 + weighted factor bonus).</p>
      <p><strong>Level</strong> and <strong>Rank</strong> are a different story. They are built over time: every run's score is paid into your XP, and ranks are title bands over levels.</p>
      <p>One great run can make a score.<br />A history of great runs makes a pilot.</p>
      <h3>Honest play</h3>
      <p>Everything here runs locally in your browser. The leaderboard on the menu is seeded with sample pilots so you have someone to beat; your best run is added to it after each race.</p>
    </Modal>
  )
}

export function UpdatesModal({ onClose }: { onClose: () => void }) {
  const notes = [
    { version: 'Update 0.3.0', notes: ['Added the Share card with your rig, pilot and Pulse Score.', 'Added level and rank progression, plus day / night lighting in Settings.', 'Added Constellations: a strip of milestones that fills during a run.'] },
    { version: 'Update 0.2.0', notes: ['Added Relay Lanes at the end of every lit Beacon.', 'Titans now drop a Comet Core and a spare Shockwave.', 'Reworked how the Pulse Score is calculated and shown on the leaderboard.'] },
    { version: 'Update 0.1.0', notes: ['Initial rig and pilot customization system.', 'Touch controls for mobile.', 'Results and evaluation screens.'] },
  ]
  return (
    <Modal onClose={onClose}>
      <h2>Updates</h2>
      {notes.map(n => <div key={n.version}><h3>{n.version}</h3><ul style={{ margin: 0, paddingLeft: 18 }}>{n.notes.map(x => <li key={x} className="muted" style={{ lineHeight: 1.6 }}>{x}</li>)}</ul></div>)}
      <p style={{ marginTop: 18 }}>Nothing here is final. Rigs, pilots and the grid will keep evolving.</p>
    </Modal>
  )
}
