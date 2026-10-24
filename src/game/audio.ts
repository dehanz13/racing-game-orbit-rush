/**
 * Tiny synthesized sound bank — no audio files needed. Each cue is a short
 * oscillator envelope. The original used Howler with ~25 mp3 cues; we keep
 * the same event names so the engine code reads the same way.
 */
export type Cue = 'click' | 'spark' | 'goldSpark' | 'comet' | 'crate' | 'overdrive' | 'repair' | 'shield'
  | 'bolt' | 'droneShot' | 'hit' | 'droneDown' | 'titanDown' | 'shockwave' | 'beacon' | 'relayGate' | 'relayDone'
  | 'stage' | 'start' | 'death' | 'jump' | 'upgrade' | 'multiplier' | 'time'

class Audio {
  ctx: AudioContext | null = null
  enabled = true
  musicEnabled = true
  private master: GainNode | null = null
  private musicGain: GainNode | null = null
  private musicTimer: number | null = null
  private engineOsc: OscillatorNode | null = null
  private engineGain: GainNode | null = null

  init() {
    if (this.ctx) return
    const AC = window.AudioContext || (window as any).webkitAudioContext
    if (!AC) return
    this.ctx = new AC()
    this.master = this.ctx.createGain(); this.master.gain.value = 0.5; this.master.connect(this.ctx.destination)
    this.musicGain = this.ctx.createGain(); this.musicGain.gain.value = 0.18; this.musicGain.connect(this.master)
  }
  resume() { this.ctx?.resume() }
  setEnabled(v: boolean) { this.enabled = v; if (this.master) this.master.gain.value = v ? 0.5 : 0 }
  setMusic(v: boolean) { this.musicEnabled = v; if (this.musicGain) this.musicGain.gain.value = v ? 0.18 : 0 }

  private tone(freq: number, dur: number, type: OscillatorType = 'sine', gain = 0.3, slideTo?: number, dest?: AudioNode) {
    if (!this.ctx || !this.master || !this.enabled) return
    const t = this.ctx.currentTime
    const o = this.ctx.createOscillator(); const g = this.ctx.createGain()
    o.type = type; o.frequency.setValueAtTime(freq, t)
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur)
    g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    o.connect(g); g.connect(dest ?? this.master); o.start(t); o.stop(t + dur + 0.02)
  }
  private noise(dur: number, gain = 0.25) {
    if (!this.ctx || !this.master || !this.enabled) return
    const t = this.ctx.currentTime
    const buf = this.ctx.createBuffer(1, this.ctx.sampleRate * dur, this.ctx.sampleRate)
    const d = buf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length)
    const s = this.ctx.createBufferSource(); s.buffer = buf
    const g = this.ctx.createGain(); g.gain.value = gain
    const f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 900
    s.connect(f); f.connect(g); g.connect(this.master); s.start(t)
  }

  play(c: Cue) {
    switch (c) {
      case 'click': return this.tone(880, 0.05, 'square', 0.08)
      case 'spark': return this.tone(1200, 0.08, 'triangle', 0.18, 1800)
      case 'goldSpark': { this.tone(1046, 0.1, 'triangle', 0.2, 1568); setTimeout(() => this.tone(2093, 0.15, 'triangle', 0.2), 80); return }
      case 'comet': { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => this.tone(f, 0.18, 'triangle', 0.22), i * 70)); return }
      case 'crate': { this.tone(660, 0.12, 'square', 0.12, 990); setTimeout(() => this.tone(1320, 0.2, 'triangle', 0.18), 100); return }
      case 'overdrive': return this.tone(200, 0.4, 'sawtooth', 0.18, 1400)
      case 'repair': return this.tone(440, 0.25, 'sine', 0.2, 880)
      case 'shield': return this.tone(300, 0.3, 'triangle', 0.2, 600)
      case 'bolt': return this.tone(900, 0.12, 'sawtooth', 0.12, 200)
      case 'droneShot': return this.tone(300, 0.15, 'square', 0.06, 120)
      case 'hit': { this.noise(0.15, 0.3); return this.tone(120, 0.2, 'square', 0.15, 50) }
      case 'droneDown': { this.noise(0.25, 0.3); return this.tone(500, 0.3, 'sawtooth', 0.15, 60) }
      case 'titanDown': { this.noise(0.6, 0.4); [300, 200, 120].forEach((f, i) => setTimeout(() => this.tone(f, 0.35, 'sawtooth', 0.2, 40), i * 120)); return }
      case 'shockwave': { this.noise(0.4, 0.4); return this.tone(80, 0.5, 'sine', 0.3, 30) }
      case 'beacon': { [392, 523, 659, 784, 1046].forEach((f, i) => setTimeout(() => this.tone(f, 0.25, 'triangle', 0.2), i * 60)); return }
      case 'relayGate': return this.tone(1500, 0.07, 'square', 0.1, 2000)
      case 'relayDone': { [784, 988, 1175, 1568].forEach((f, i) => setTimeout(() => this.tone(f, 0.2, 'triangle', 0.22), i * 80)); return }
      case 'stage': { [262, 330, 392, 523, 659].forEach((f, i) => setTimeout(() => this.tone(f, 0.4, 'sine', 0.2), i * 90)); return }
      case 'start': { [523, 523, 523, 1046].forEach((f, i) => setTimeout(() => this.tone(f, i === 3 ? 0.5 : 0.15, 'square', 0.15), i * 250)); return }
      case 'death': { this.noise(0.8, 0.5); [400, 300, 200, 100].forEach((f, i) => setTimeout(() => this.tone(f, 0.4, 'sawtooth', 0.2, 40), i * 150)); return }
      case 'jump': return this.tone(500, 0.15, 'triangle', 0.12, 900)
      case 'upgrade': { [659, 880, 1175, 1760].forEach((f, i) => setTimeout(() => this.tone(f, 0.25, 'sine', 0.2), i * 70)); return }
      case 'multiplier': return this.tone(700, 0.2, 'triangle', 0.18, 1400)
      case 'time': return this.tone(1000, 0.1, 'square', 0.12, 1500)
    }
  }

  /** Looping engine hum whose pitch follows speed (0..1). */
  engine(level: number) {
    if (!this.ctx || !this.master) return
    if (!this.engineOsc) {
      this.engineOsc = this.ctx.createOscillator(); this.engineOsc.type = 'sawtooth'
      this.engineGain = this.ctx.createGain(); this.engineGain.gain.value = 0
      const f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 400
      this.engineOsc.connect(f); f.connect(this.engineGain); this.engineGain.connect(this.master); this.engineOsc.start()
    }
    const t = this.ctx.currentTime
    this.engineOsc.frequency.setTargetAtTime(40 + level * 140, t, 0.08)
    this.engineGain!.gain.setTargetAtTime(this.enabled ? 0.03 + level * 0.05 : 0, t, 0.1)
  }
  engineOff() { if (this.engineGain && this.ctx) this.engineGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.2) }

  /** Minimal generative music: an arpeggio on a 4-chord loop. */
  startMusic() {
    if (!this.ctx || this.musicTimer || !this.musicGain) return
    const chords = [[0, 4, 7, 11], [5, 9, 12, 16], [7, 11, 14, 17], [2, 5, 9, 12]]
    let step = 0
    const base = 110
    this.musicTimer = window.setInterval(() => {
      if (!this.musicEnabled || !this.ctx) return
      const chord = chords[Math.floor(step / 8) % chords.length]
      const n = chord[step % chord.length] + (step % 8 >= 4 ? 12 : 0)
      const f = base * Math.pow(2, n / 12)
      this.tone(f, 0.25, 'triangle', 0.5, undefined, this.musicGain!)
      if (step % 4 === 0) this.tone(base / 2 * Math.pow(2, chord[0] / 12), 0.5, 'sine', 0.6, undefined, this.musicGain!)
      step++
    }, 150)
  }
  stopMusic() { if (this.musicTimer) { clearInterval(this.musicTimer); this.musicTimer = null } }
}

export const audio = new Audio()
