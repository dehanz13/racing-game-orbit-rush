import {
  BEACONS, CONSTELLATIONS, ENEMIES, EXCITEMENT, FACTORS, FactorKey, JUMP_PADS, PICKUPS, PICKUP_EFFECTS,
  PickupKind, PILOTS, PILOT_HEADGEAR, RELAY, RIGS, RUN, SCORE, SPEED_DISPLAY, STAGES, STAGE_THRESHOLDS,
  VEHICLE, WEAPONS, WORLD, Palette,
} from '@/config/game'
import { Input } from './input'
import { audio, Cue } from './audio'
import type { RunResult } from '@/store/game'

// ---------------------------------------------------------------------------
// Entity types
// ---------------------------------------------------------------------------
export interface Pickup { id: string; kind: PickupKind; x: number; z: number; y: number; taken: boolean; phase: number }
export interface Drone { id: number; x: number; z: number; heading: number; health: number; maxHealth: number; titan: boolean; shotAt: number; hitFlash: number; spawnedAt: number; vx: number; vz: number }
export interface Bolt { id: number; x: number; z: number; y: number; vx: number; vz: number; player: boolean; targetId: number | null; bornAt: number }
export interface Beacon { index: number; x: number; z: number; lit: boolean; litAt: number }
export interface RelayGate { x: number; z: number; heading: number; passed: boolean }
export interface Relay { gates: RelayGate[]; startedAt: number; next: number; done: boolean; failed: boolean }
export interface JumpPad { id: string; x: number; z: number; heading: number }
export interface Popup { id: number; text: string; color: string; x: number; y: number; z: number; bornAt: number }
export interface Effect { id: number; kind: 'explosion' | 'shock' | 'beacon' | 'spawn' | 'hit'; x: number; z: number; bornAt: number; radius: number; color: string }

export interface Player {
  x: number; z: number; y: number; vy: number; heading: number; speed: number
  hull: number; maxHull: number; shield: number; maxShield: number
  overdriveUntil: number; overdriveCharges: number; bolts: number; shockwaves: number
  lockTarget: number | null; lockProgress: number
  driftingMs: number; airMs: number; excitement: number
  hitFlash: number
}

export interface HudState {
  sparks: number; score: number; multiplier: number; distance: number; timeLeft: number
  speedDisplay: number; excitement: number; hull: number; maxHull: number; shield: number; maxShield: number
  bolts: number; shockwaves: number; overdriveCharges: number; overdriveActive: boolean
  factors: Record<FactorKey, number>
  stage: number; palette: Palette
  beaconsLit: number; beaconTotal: number; nearestBeaconAngle: number; nearestBeaconDist: number
  relay: { active: boolean; next: number; total: number; timeLeft: number } | null
  constellations: string[]
  lockTarget: boolean; lockProgress: number
  dronesAlive: number; running: boolean; paused: boolean; over: boolean
  message: { text: string; sub?: string; at: number } | null
}

export interface EngineOptions {
  rigKey: string; paintKey: string; pilotKey: string; headgearKey: string; callsign: string
}

// Small deterministic RNG so each chunk regenerates identically.
const hash2 = (x: number, z: number) => {
  let h = (x * 374761393 + z * 668265263) | 0
  h = (h ^ (h >> 13)) * 1274126177
  return (h ^ (h >> 16)) >>> 0
}
const mulberry = (seed: number) => () => {
  seed |= 0; seed = (seed + 0x6D2B79F5) | 0
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v))
const wrapAngle = (a: number) => Math.atan2(Math.sin(a), Math.cos(a))

const pickupWeights = Object.values(PICKUPS).filter(p => p.weight > 0)
const totalWeight = pickupWeights.reduce((s, p) => s + p.weight, 0)
const rollPickup = (r: number): PickupKind => {
  let acc = r * totalWeight
  for (const p of pickupWeights) { acc -= p.weight; if (acc <= 0) return p.kind }
  return 'spark'
}

// ---------------------------------------------------------------------------
export class Engine {
  // --- entities
  player!: Player
  pickups = new Map<string, Pickup[]>()  // by chunk key
  taken = new Set<string>()
  drones: Drone[] = []
  bolts: Bolt[] = []
  beacons: Beacon[] = []
  relay: Relay | null = null
  pads = new Map<string, JumpPad[]>()
  popups: Popup[] = []
  effects: Effect[] = []
  relayReward: Pickup | null = null

  // --- run state
  now = 0
  running = false
  paused = false
  over = false
  stage = 0
  palette: Palette = STAGES[0][0]
  sparks = 0
  multiplier = 1
  beaconMultiplier = 1
  maxMultiplier = 1
  distance = 0
  timeLeft = RUN.baseTimeSeconds
  dronesDefeated = 0
  titansDefeated = 0
  constellations: string[] = []
  boltsFired = 0
  boltsHit = 0
  jumps = 0
  shockwavesUsed = 0
  relaysDone = 0
  kindsCollected = new Set<PickupKind>()
  excitementSum = 0
  excitementSamples = 0
  topSpeed = 0
  hitsTaken = 0
  message: HudState['message'] = null
  startedAt = 0

  // --- config
  opts: EngineOptions
  rig = RIGS[0]
  pilot = PILOTS[0]
  base: Record<FactorKey, number> = { velocity: 50, control: 50, flair: 50, reach: 50 }

  private ids = 1
  private prevFireHeld = false
  private fireHeldSince = 0
  private lastShock = 0
  private lastSparkGrant = 0
  private cues: Cue[] = []
  onEnd: ((r: RunResult) => void) | null = null

  constructor(opts: EngineOptions) {
    this.opts = opts
    this.rig = RIGS.find(r => r.key === opts.rigKey) ?? RIGS[0]
    this.pilot = PILOTS.find(p => p.key === opts.pilotKey) ?? PILOTS[0]
    const gear = PILOT_HEADGEAR.find(h => h.key === opts.headgearKey)
    const bonus: Partial<Record<FactorKey, number>> = (gear && 'bonus' in gear ? gear.bonus : {}) as any
    for (const f of FACTORS) this.base[f.key] = clamp(this.pilot.base[f.key] + (bonus[f.key] ?? 0), 0, 100)
    this.reset()
  }

  reset() {
    const maxHull = Math.round(VEHICLE.baseHealth * this.rig.stats.hull)
    this.player = {
      x: 0, z: 0, y: 0, vy: 0, heading: 0, speed: 0,
      hull: maxHull, maxHull, shield: VEHICLE.baseArmor, maxShield: VEHICLE.maxArmor,
      overdriveUntil: 0, overdriveCharges: 1, bolts: 3, shockwaves: 1,
      lockTarget: null, lockProgress: 0, driftingMs: 0, airMs: 0, excitement: 0.15, hitFlash: 0,
    }
    this.pickups.clear(); this.taken.clear(); this.pads.clear()
    this.drones = []; this.bolts = []; this.popups = []; this.effects = []; this.relay = null; this.relayReward = null
    this.now = 0; this.running = true; this.paused = false; this.over = false
    this.stage = 0; this.palette = STAGES[0][Math.floor(Math.random() * 3)]
    this.sparks = 0; this.multiplier = 1; this.beaconMultiplier = 1; this.maxMultiplier = 1
    this.distance = 0; this.timeLeft = RUN.baseTimeSeconds
    this.dronesDefeated = 0; this.titansDefeated = 0; this.constellations = []
    this.boltsFired = 0; this.boltsHit = 0; this.jumps = 0; this.shockwavesUsed = 0; this.relaysDone = 0
    this.kindsCollected.clear(); this.excitementSum = 0; this.excitementSamples = 0; this.topSpeed = 0; this.hitsTaken = 0
    this.lastSparkGrant = 0; this.lastShock = 0; this.prevFireHeld = false
    this.startedAt = performance.now()
    // Beacons on a spiral around the origin
    this.beacons = Array.from({ length: BEACONS.count }, (_, i) => {
      const a = i * 2.399 + 0.7
      const r = 70 + i * BEACONS.spiralStep * 0.42
      return { index: i, x: Math.cos(a) * r, z: Math.sin(a) * r, lit: false, litAt: -1e9 }
    })
    this.message = { text: 'GO', sub: 'Collect Sparks. Light Beacons. Survive.', at: 0 }
    this.cue('start')
  }

  // ------------------------------------------------------------------ audio
  private cue(c: Cue) { this.cues.push(c) }
  flushCues() { for (const c of this.cues) audio.play(c); this.cues.length = 0 }

  // ------------------------------------------------------------------ world
  private chunkKey(cx: number, cz: number) { return `${cx},${cz}` }
  private ensureChunk(cx: number, cz: number) {
    const key = this.chunkKey(cx, cz)
    if (this.pickups.has(key)) return
    const rnd = mulberry(hash2(cx, cz))
    const list: Pickup[] = []
    const ox = cx * WORLD.chunkSize, oz = cz * WORLD.chunkSize
    for (let i = 0; i < WORLD.pickupsPerChunk; i++) {
      const id = `${key}:${i}`
      if (this.taken.has(id)) continue
      const x = ox + rnd() * WORLD.chunkSize, z = oz + rnd() * WORLD.chunkSize
      if (cx === 0 && cz === 0 && Math.hypot(x, z) < 8) continue
      list.push({ id, kind: rollPickup(rnd()), x, z, y: 1.2, taken: false, phase: rnd() * Math.PI * 2 })
    }
    this.pickups.set(key, list)
    const pads: JumpPad[] = []
    if (rnd() < JUMP_PADS.perChunk) pads.push({ id: `${key}:pad`, x: ox + 8 + rnd() * (WORLD.chunkSize - 16), z: oz + 8 + rnd() * (WORLD.chunkSize - 16), heading: rnd() * Math.PI * 2 })
    this.pads.set(key, pads)
  }
  private updateChunks() {
    const cx = Math.floor(this.player.x / WORLD.chunkSize), cz = Math.floor(this.player.z / WORLD.chunkSize)
    const keep = new Set<string>()
    for (let dx = -WORLD.viewChunks; dx <= WORLD.viewChunks; dx++) for (let dz = -WORLD.viewChunks; dz <= WORLD.viewChunks; dz++) {
      this.ensureChunk(cx + dx, cz + dz); keep.add(this.chunkKey(cx + dx, cz + dz))
    }
    for (const k of [...this.pickups.keys()]) if (!keep.has(k)) { this.pickups.delete(k); this.pads.delete(k) }
  }
  *allPickups(): Generator<Pickup> { for (const l of this.pickups.values()) for (const p of l) if (!p.taken) yield p; if (this.relayReward && !this.relayReward.taken) yield this.relayReward }
  *allPads(): Generator<JumpPad> { for (const l of this.pads.values()) for (const p of l) yield p }

  // ------------------------------------------------------------------ helpers
  private popup(text: string, color: string, x: number, z: number, y = 2) { this.popups.push({ id: this.ids++, text, color, x, y, z, bornAt: this.now }) }
  private effect(kind: Effect['kind'], x: number, z: number, radius: number, color: string) { this.effects.push({ id: this.ids++, kind, x, z, bornAt: this.now, radius, color }) }
  private excite(v: number) { this.player.excitement = clamp(this.player.excitement + v, 0, 1) }
  private bumpMultiplier(m: number) { this.multiplier = Math.min(8, this.multiplier * m); this.maxMultiplier = Math.max(this.maxMultiplier, this.totalMultiplier()) }
  totalMultiplier() { return this.multiplier * this.beaconMultiplier }
  private say(text: string, sub?: string) { this.message = { text, sub, at: this.now } }

  factors(): Record<FactorKey, number> {
    const avgExc = this.excitementSamples ? this.excitementSum / this.excitementSamples : 0
    const maxSpeed = VEHICLE.maxSpeed * this.rig.stats.speed * VEHICLE.nitro.multiplier
    const accuracy = this.boltsFired ? this.boltsHit / this.boltsFired : 0
    return {
      velocity: clamp(this.base.velocity * 0.6 + 32 * avgExc + 12 * (this.topSpeed / maxSpeed), 0, 100),
      control: clamp(this.base.control * 0.6 + 28 * accuracy + 6 * Math.min(3, this.relaysDone) - 2 * Math.min(8, this.hitsTaken), 0, 100),
      flair: clamp(this.base.flair * 0.6 + 4 * this.kindsCollected.size + 1.5 * Math.min(10, this.jumps) + 3 * Math.min(5, this.shockwavesUsed), 0, 100),
      reach: clamp(this.base.reach * 0.6 + 2.2 * this.beacons.filter(b => b.lit).length + Math.min(20, this.distance / 120), 0, 100),
    }
  }

  // Pulse Score. Raw points from loot and kills, times the multiplier, times a
  // bonus from the four weighted factors (40/30/20/10).
  score(): number {
    const raw = this.sparks + SCORE.perRival * this.dronesDefeated + SCORE.perTitan * this.titansDefeated + SCORE.perBeacon * this.beacons.filter(b => b.lit).length
    const f = this.factors()
    const weighted = FACTORS.reduce((s, d) => s + d.weight * (f[d.key] / 100), 0)
    return Math.round(raw * this.totalMultiplier() * (1 + weighted))
  }

  // ------------------------------------------------------------------ main step
  step(dt: number, input: Input) {
    if (!this.running || this.over) return
    if (input.consume('pause')) { this.paused = !this.paused; return }
    if (input.consume('restart')) { this.reset(); return }
    if (this.paused) return
    dt = Math.min(dt, 1 / 20)
    this.now += dt
    const p = this.player

    // ---- timer
    this.timeLeft -= dt
    if (this.timeLeft <= 0) { this.timeLeft = 0; return this.finish('Time over') }

    // ---- driving
    const throttle = (input.held.has('up') ? 1 : 0) - (input.held.has('down') ? 1 : 0) + input.throttleAxis
    const steer = (input.held.has('left') ? 1 : 0) - (input.held.has('right') ? 1 : 0) - input.steerAxis
    const overdrive = this.now < p.overdriveUntil
    const maxSpeed = VEHICLE.maxSpeed * this.rig.stats.speed * (overdrive ? VEHICLE.nitro.multiplier : 1)
    if (throttle > 0) p.speed += VEHICLE.accel * (overdrive ? 1.8 : 1) * dt * Math.min(1, throttle)
    else if (throttle < 0) p.speed -= (p.speed > 0 ? VEHICLE.brake : VEHICLE.accel * 0.6) * dt * Math.min(1, -throttle)
    else if (overdrive) p.speed += VEHICLE.accel * dt
    p.speed *= Math.pow(VEHICLE.drag, dt * 60)
    p.speed = clamp(p.speed, -VEHICLE.maxReverse, maxSpeed)
    const speedFrac = Math.abs(p.speed) / (VEHICLE.maxSpeed * this.rig.stats.speed)
    const steerFactor = (1 - (1 - VEHICLE.steerAtSpeed) * Math.min(1, speedFrac)) * this.rig.stats.grip
    if (Math.abs(p.speed) > 0.5 && p.y <= 0.001) p.heading += steer * VEHICLE.steerRate * steerFactor * dt * Math.sign(p.speed)
    p.x += Math.sin(p.heading) * p.speed * dt
    p.z += Math.cos(p.heading) * p.speed * dt
    this.distance += Math.abs(p.speed) * dt
    this.topSpeed = Math.max(this.topSpeed, Math.abs(p.speed))

    // ---- jump / air
    if (input.consume('jump') && p.y <= 0.001 && Math.abs(p.speed) >= VEHICLE.jump.minSpeed) { p.vy = VEHICLE.jump.velocity; this.jumps++; this.cue('jump') }
    if (p.y > 0 || p.vy > 0) {
      p.y += p.vy * dt; p.vy -= (p.vy > VEHICLE.jump.velocity ? VEHICLE.jumpPad.gravity : VEHICLE.jump.gravity) * dt
      if (p.y <= 0) { p.y = 0; p.vy = 0; p.airMs = 0 } else p.airMs += dt * 1000
    }
    for (const pad of this.allPads()) {
      if (p.y <= 0.001 && Math.abs(pad.x - p.x) < JUMP_PADS.halfSize && Math.abs(pad.z - p.z) < JUMP_PADS.halfSize && Math.abs(p.speed) > 3) {
        p.vy = VEHICLE.jumpPad.velocity; this.jumps++; this.cue('jump'); this.effect('spawn', pad.x, pad.z, 6, this.palette.accent)
      }
    }

    // ---- drift + excitement (copied growth model)
    const drifting = Math.abs(steer) > 0.5 && speedFrac > 0.55 && p.y <= 0.001
    p.driftingMs = drifting ? p.driftingMs + dt * 1000 : 0
    p.excitement -= EXCITEMENT.decayPerSecond * dt
    const disp = Math.abs(p.speed) * SPEED_DISPLAY
    let growth = 0
    for (const t of EXCITEMENT.speedThresholds) if (disp >= t.speed) growth = t.growthPerSecond
    p.excitement += growth * dt
    if (p.driftingMs > VEHICLE.driftThresholdMs) p.excitement += EXCITEMENT.driftGrowthPerSecond * dt
    if (p.airMs > VEHICLE.airThresholdMs) p.excitement += EXCITEMENT.airGrowthPerSecond * dt
    p.excitement = clamp(p.excitement, 0, 1)
    this.excitementSum += p.excitement; this.excitementSamples++

    // ---- multiplier decay back toward 1
    if (this.multiplier > 1) this.multiplier = Math.max(1, this.multiplier - PICKUP_EFFECTS.multiplierDecayPerSecond * dt)

    // ---- overdrive
    if (input.consume('nitro') && p.overdriveCharges > 0 && !overdrive) { p.overdriveCharges--; p.overdriveUntil = this.now + VEHICLE.nitro.durationMs / 1000; this.cue('overdrive') }

    // ---- world + pickups
    this.updateChunks()
    for (const pk of this.allPickups()) {
      const r = PICKUPS[pk.kind].radius + 2.2
      if ((pk.x - p.x) ** 2 + (pk.z - p.z) ** 2 < r * r && p.y < 3) this.collect(pk)
    }

    // ---- beacons
    let nearest: Beacon | null = null, nd = Infinity
    for (const b of this.beacons) {
      const d = Math.hypot(b.x - p.x, b.z - p.z)
      if (!b.lit && d < nd) { nd = d; nearest = b }
      if (d < BEACONS.radius && !b.lit && this.now * 1000 - b.litAt > BEACONS.revisitCooldownMs) this.lightBeacon(b)
    }
    this.nearestBeacon = nearest; this.nearestBeaconDist = nd

    // ---- relay lane
    if (this.relay && !this.relay.done && !this.relay.failed) {
      const g = this.relay.gates[this.relay.next]
      const dx = p.x - g.x, dz = p.z - g.z
      // gate local coords: along = forward axis of the lane, across = sideways
      const along = dx * Math.sin(g.heading) + dz * Math.cos(g.heading)
      const across = dx * Math.cos(g.heading) - dz * Math.sin(g.heading)
      if (Math.abs(along) < 3 && Math.abs(across) < RELAY.gateHalfWidth) {
        g.passed = true; this.relay.next++; this.cue('relayGate'); this.popup('GATE', this.palette.accent, g.x, g.z, 3)
        if (this.relay.next >= this.relay.gates.length) this.completeRelay()
      }
      if (this.now - this.relay.startedAt > RELAY.timeLimitMs / 1000) { this.relay.failed = true; this.say('Lane missed', 'Try the next Beacon') }
    }

    // ---- stage progression
    const nextStage = STAGE_THRESHOLDS.findIndex((t, i) => this.sparks >= t && (STAGE_THRESHOLDS[i + 1] === undefined || this.sparks < STAGE_THRESHOLDS[i + 1]))
    if (nextStage > this.stage) { this.stage = nextStage; this.palette = STAGES[nextStage][Math.floor(Math.random() * 3)]; this.cue('stage'); this.say(`STAGE ${nextStage + 1}`, 'The grid shifts. Drones get bolder.') }

    // ---- weapons
    this.updateFiring(input)
    if (input.consume('boom')) this.shockwave()

    // ---- enemies
    this.updateDrones(dt)
    this.updateBolts(dt)

    // ---- constellations
    const sc = this.score()
    for (const c of CONSTELLATIONS) if (sc >= c.score && !this.constellations.includes(c.key)) { this.constellations.push(c.key); this.popup(c.label, '#ffe066', p.x, p.z, 4); this.cue('goldSpark') }

    // ---- housekeeping
    this.popups = this.popups.filter(o => this.now - o.bornAt < 1)
    this.effects = this.effects.filter(e => this.now - e.bornAt < 1.2)
    p.hitFlash = Math.max(0, p.hitFlash - dt * 3)
    if (this.message && this.now - this.message.at > 2.6) this.message = null
    if (p.hull <= 0) this.finish('Hull breached')
  }

  nearestBeacon: Beacon | null = null
  nearestBeaconDist = Infinity

  // ------------------------------------------------------------------ pickups
  private collect(pk: Pickup) {
    pk.taken = true; this.taken.add(pk.id)
    const p = this.player, def = PICKUPS[pk.kind]
    this.kindsCollected.add(pk.kind)
    this.popup(def.popup, def.color, pk.x, pk.z)
    this.effect('spawn', pk.x, pk.z, 2.5, def.color)
    switch (pk.kind) {
      case 'spark': this.addSparks(PICKUP_EFFECTS.spark); this.excite(EXCITEMENT.events.like); this.cue('spark'); break
      case 'goldSpark': this.addSparks(PICKUP_EFFECTS.goldSpark); this.excite(EXCITEMENT.events.like * 2); this.cue('goldSpark'); break
      case 'comet': this.bumpMultiplier(PICKUP_EFFECTS.comet); this.excite(EXCITEMENT.events.cup); this.cue('comet'); this.say('COMET CORE', 'x1.75 multiplier'); break
      case 'crate': this.bumpMultiplier(PICKUP_EFFECTS.crate); p.shockwaves++; this.excite(EXCITEMENT.events.presentBox); this.cue('crate'); break
      case 'overdrive': p.overdriveCharges++; this.cue('overdrive'); break
      case 'repair': p.hull = Math.min(p.maxHull, p.hull + PICKUP_EFFECTS.repair); this.cue('repair'); break
      case 'shield': p.shield = Math.min(p.maxShield, p.shield + PICKUP_EFFECTS.shield); this.cue('shield'); break
      case 'hullUpgrade': p.maxHull += PICKUP_EFFECTS.hullUpgrade; p.hull = p.maxHull; this.cue('upgrade'); break
      case 'shieldUpgrade': p.maxShield += PICKUP_EFFECTS.shieldUpgrade; p.shield = p.maxShield; this.cue('upgrade'); break
      case 'multiplier': this.bumpMultiplier(PICKUP_EFFECTS.multiplier); this.cue('multiplier'); break
      case 'timeShard': this.timeLeft += PICKUP_EFFECTS.timeShardSeconds; this.cue('time'); break
    }
  }
  private addSparks(n: number) {
    this.sparks += n
    // "Every 10 Sparks earn you 3 Bolts"
    const grants = Math.floor(this.sparks / WEAPONS.boltsPerSparks.every)
    if (grants > this.lastSparkGrant) { this.player.bolts += WEAPONS.boltsPerSparks.grant * (grants - this.lastSparkGrant); this.lastSparkGrant = grants; this.popup(`+${WEAPONS.boltsPerSparks.grant} Bolts`, '#ffffff', this.player.x, this.player.z, 3.5) }
  }

  // ------------------------------------------------------------------ beacons & relay
  private lightBeacon(b: Beacon) {
    b.lit = true; b.litAt = this.now * 1000
    this.beaconMultiplier += (b.index + 1) * BEACONS.multiplierPerIndex
    this.maxMultiplier = Math.max(this.maxMultiplier, this.totalMultiplier())
    this.excite(EXCITEMENT.events.presentBox)
    this.effect('beacon', b.x, b.z, 14, this.palette.accent)
    this.cue('beacon')
    this.say(`BEACON ${b.index + 1} LIT`, `Multiplier +${((b.index + 1) * BEACONS.multiplierPerIndex).toFixed(2)}`)
    // Supply crate drops at the beacon, and a Relay Lane opens ahead of the player
    const list = this.pickups.get(this.chunkKey(Math.floor(b.x / WORLD.chunkSize), Math.floor(b.z / WORLD.chunkSize)))
    list?.push({ id: `beacon-crate-${b.index}`, kind: 'crate', x: b.x + 4, z: b.z + 4, y: 1.2, taken: false, phase: 0 })
    const p = this.player
    const h = p.heading
    const gates: RelayGate[] = Array.from({ length: RELAY.gates }, (_, i) => ({
      x: p.x + Math.sin(h) * (30 + i * RELAY.gateSpacing), z: p.z + Math.cos(h) * (30 + i * RELAY.gateSpacing), heading: h, passed: false,
    }))
    this.relay = { gates, startedAt: this.now, next: 0, done: false, failed: false }
  }
  private completeRelay() {
    if (!this.relay) return
    this.relay.done = true; this.relaysDone++
    const g = this.relay.gates[this.relay.gates.length - 1]
    const kind: PickupKind = Math.random() < 0.5 ? 'hullUpgrade' : 'shieldUpgrade'
    this.relayReward = { id: `relay-${this.ids++}`, kind: RELAY.rewardComet ? 'comet' : kind, x: g.x + Math.sin(g.heading) * 14, z: g.z + Math.cos(g.heading) * 14, y: 1.2, taken: false, phase: 0 }
    const list = this.pickups.get(this.chunkKey(Math.floor(g.x / WORLD.chunkSize), Math.floor(g.z / WORLD.chunkSize)))
    list?.push({ id: `relay-up-${this.ids++}`, kind, x: g.x + Math.sin(g.heading) * 14 + 5, z: g.z + Math.cos(g.heading) * 14, y: 1.2, taken: false, phase: 0 })
    this.cue('relayDone'); this.say('RELAY COMPLETE', 'Comet Core + upgrade ahead')
  }

  // ------------------------------------------------------------------ weapons
  private updateFiring(input: Input) {
    const p = this.player
    const held = input.held.has('fire')
    if (held && !this.prevFireHeld) this.fireHeldSince = this.now
    // Lock-on: hold fire with a drone in range in front of you
    if (held && this.now - this.fireHeldSince >= WEAPONS.bolt.lockTimeMs / 1000) {
      const t = this.nearestDrone(WEAPONS.bolt.lockRange, true)
      p.lockTarget = t ? t.id : null
      p.lockProgress = t ? clamp((this.now - this.fireHeldSince - WEAPONS.bolt.lockTimeMs / 1000) / 0.3, 0, 1) : 0
    }
    if (!held && this.prevFireHeld) {
      const homing = p.lockTarget !== null && p.lockProgress >= 1
      this.fireBolt(homing ? p.lockTarget : null)
      p.lockTarget = null; p.lockProgress = 0
    }
    this.prevFireHeld = held
  }
  private nearestDrone(range: number, frontOnly: boolean): Drone | null {
    const p = this.player
    let best: Drone | null = null, bd = range
    for (const d of this.drones) {
      const dx = d.x - p.x, dz = d.z - p.z, dist = Math.hypot(dx, dz)
      if (dist > bd) continue
      if (frontOnly) { const dot = (dx * Math.sin(p.heading) + dz * Math.cos(p.heading)) / (dist || 1); if (dot < 0.2) continue }
      bd = dist; best = d
    }
    return best
  }
  private fireBolt(targetId: number | null) {
    const p = this.player
    if (p.bolts <= 0) { this.popup('No Bolts', '#ff6a3d', p.x, p.z, 3); return }
    p.bolts--; this.boltsFired++
    const s = WEAPONS.bolt.speed + Math.max(0, p.speed)
    this.bolts.push({ id: this.ids++, x: p.x + Math.sin(p.heading) * 2.5, z: p.z + Math.cos(p.heading) * 2.5, y: 1 + p.y, vx: Math.sin(p.heading) * s, vz: Math.cos(p.heading) * s, player: true, targetId, bornAt: this.now })
    this.cue('bolt')
  }
  private shockwave() {
    const p = this.player
    if (p.shockwaves <= 0 || this.now - this.lastShock < WEAPONS.shockwave.cooldownMs / 1000) return
    p.shockwaves--; this.lastShock = this.now; this.shockwavesUsed++
    this.effect('shock', p.x, p.z, WEAPONS.shockwave.radius, '#ffffff')
    this.cue('shockwave'); this.excite(EXCITEMENT.events.explosion)
    for (const d of [...this.drones]) {
      const dx = d.x - p.x, dz = d.z - p.z, dist = Math.hypot(dx, dz)
      if (dist < WEAPONS.shockwave.radius) { d.vx += dx / dist * 40; d.vz += dz / dist * 40; this.damageDrone(d, WEAPONS.shockwave.damage) }
    }
    for (const b of this.bolts) if (!b.player && Math.hypot(b.x - p.x, b.z - p.z) < WEAPONS.shockwave.radius) b.bornAt = -1e9
  }

  // ------------------------------------------------------------------ drones
  private updateDrones(dt: number) {
    const p = this.player
    const max = ENEMIES.maxDrones[this.stage]
    if (this.now > 4 && this.drones.length < max && Math.random() < dt * 0.8) this.spawnDrone()
    for (const d of this.drones) {
      const cfg = d.titan ? ENEMIES.titan : ENEMIES.drone
      const dx = p.x - d.x, dz = p.z - d.z, dist = Math.hypot(dx, dz)
      const want = Math.atan2(dx, dz)
      // orbit the player at mid range instead of ramming constantly
      const desired = dist > 30 ? want : want + Math.PI / 2 * (d.id % 2 ? 1 : -1)
      d.heading += clamp(wrapAngle(desired - d.heading), -cfg.turn * dt, cfg.turn * dt)
      const sp = cfg.speed * (dist > 80 ? 1.6 : 1)
      d.x += Math.sin(d.heading) * sp * dt + d.vx * dt
      d.z += Math.cos(d.heading) * sp * dt + d.vz * dt
      d.vx *= 0.9; d.vz *= 0.9
      d.hitFlash = Math.max(0, d.hitFlash - dt * 4)
      // shoot
      if (dist < WEAPONS.droneShot.range && this.now - d.shotAt > WEAPONS.droneShot.cooldownMs / 1000 * (d.titan ? 0.6 : 1) && this.now - d.spawnedAt > 1.5) {
        d.shotAt = this.now
        const lead = 0.6
        const tx = p.x + Math.sin(p.heading) * p.speed * lead, tz = p.z + Math.cos(p.heading) * p.speed * lead
        const a = Math.atan2(tx - d.x, tz - d.z)
        this.bolts.push({ id: this.ids++, x: d.x, z: d.z, y: 1, vx: Math.sin(a) * WEAPONS.droneShot.speed, vz: Math.cos(a) * WEAPONS.droneShot.speed, player: false, targetId: null, bornAt: this.now })
        this.cue('droneShot')
      }
      // ram
      if (dist < cfg.radius + 2.5 && p.y < 2) {
        this.damagePlayer(VEHICLE.contactDamage * (d.titan ? 2 : 1))
        d.vx -= dx / dist * 60; d.vz -= dz / dist * 60
        p.speed *= 0.6
        // ramming a drone at speed hurts it too
        if (Math.abs(p.speed) > 20) this.damageDrone(d, 1)
      }
      // despawn if far
      if (dist > 260) d.health = -999
    }
    this.drones = this.drones.filter(d => d.health > -900)
  }
  private spawnDrone() {
    const p = this.player
    const a = Math.random() * Math.PI * 2
    const r = ENEMIES.spawnRadius.min + Math.random() * (ENEMIES.spawnRadius.max - ENEMIES.spawnRadius.min)
    const titan = ENEMIES.allowTitan[this.stage] && Math.random() < ENEMIES.titan.chance && !this.drones.some(d => d.titan)
    const hp = titan ? ENEMIES.titan.health : ENEMIES.drone.health
    this.drones.push({ id: this.ids++, x: p.x + Math.cos(a) * r, z: p.z + Math.sin(a) * r, heading: a + Math.PI, health: hp, maxHealth: hp, titan, shotAt: this.now, hitFlash: 0, spawnedAt: this.now, vx: 0, vz: 0 })
    if (titan) this.say('TITAN INBOUND', 'Bring it down for a Comet Core')
  }
  private damageDrone(d: Drone, n: number) {
    d.health -= n; d.hitFlash = 1
    this.excite(EXCITEMENT.events.projectileHitEnemy)
    if (d.health <= 0) {
      this.effect('explosion', d.x, d.z, d.titan ? 10 : 5, d.titan ? '#ffa43a' : '#ff6a3d')
      if (d.titan) { this.titansDefeated++; this.cue('titanDown'); this.say('TITAN DOWN', '+Comet Core') } else { this.dronesDefeated++; this.cue('droneDown') }
      this.popup(d.titan ? `+${SCORE.perTitan}` : `+${SCORE.perRival}`, '#ff8f7a', d.x, d.z, 3)
      // loot drop: sparks (titan: comet + shockwave)
      const key = this.chunkKey(Math.floor(d.x / WORLD.chunkSize), Math.floor(d.z / WORLD.chunkSize))
      const list = this.pickups.get(key)
      if (list) {
        if (d.titan) { list.push({ id: `drop-${this.ids++}`, kind: 'comet', x: d.x, z: d.z, y: 1.2, taken: false, phase: 0 }); this.player.shockwaves++ }
        for (let i = 0; i < ENEMIES.drone.sparkDrop; i++) list.push({ id: `drop-${this.ids++}`, kind: Math.random() < 0.15 ? 'goldSpark' : 'spark', x: d.x + (Math.random() - 0.5) * 6, z: d.z + (Math.random() - 0.5) * 6, y: 1.2, taken: false, phase: Math.random() * 6 })
      }
      this.drones = this.drones.filter(x => x !== d)
      if (this.player.lockTarget === d.id) { this.player.lockTarget = null; this.player.lockProgress = 0 }
    } else this.cue('hit')
  }
  private lastHitAt = -1e9
  private damagePlayer(n: number) {
    const p = this.player
    if (this.now - this.lastHitAt < 1.0) return // one second of invulnerability after any hit
    this.lastHitAt = this.now
    p.hitFlash = 1; this.hitsTaken++
    this.excite(EXCITEMENT.events.carHit)
    const absorbed = Math.min(p.shield, n)
    p.shield -= absorbed; p.hull -= (n - absorbed)
    this.effect('hit', p.x, p.z, 3, '#ff2d6f')
    this.cue('hit')
  }

  // ------------------------------------------------------------------ bolts
  private updateBolts(dt: number) {
    const p = this.player
    for (const b of this.bolts) {
      if (b.targetId !== null) {
        const t = this.drones.find(d => d.id === b.targetId)
        if (t) {
          const want = Math.atan2(t.x - b.x, t.z - b.z), cur = Math.atan2(b.vx, b.vz)
          const a = cur + clamp(wrapAngle(want - cur), -WEAPONS.bolt.homingTurn * dt, WEAPONS.bolt.homingTurn * dt)
          const s = Math.hypot(b.vx, b.vz); b.vx = Math.sin(a) * s; b.vz = Math.cos(a) * s
        }
      }
      b.x += b.vx * dt; b.z += b.vz * dt
      if (b.player) {
        for (const d of this.drones) {
          const r = (d.titan ? ENEMIES.titan.radius : ENEMIES.drone.radius)
          if ((d.x - b.x) ** 2 + (d.z - b.z) ** 2 < r * r) { this.boltsHit++; this.damageDrone(d, WEAPONS.bolt.damage); b.bornAt = -1e9; break }
        }
      } else if ((p.x - b.x) ** 2 + (p.z - b.z) ** 2 < 2.6 * 2.6 && p.y < 2.5) { this.damagePlayer(WEAPONS.droneShot.damage); b.bornAt = -1e9 }
    }
    this.bolts = this.bolts.filter(b => this.now - b.bornAt < (b.player ? WEAPONS.bolt.lifetimeMs : WEAPONS.droneShot.lifetimeMs) / 1000)
  }

  // ------------------------------------------------------------------ finish
  private finish(reason: string) {
    if (this.over) return
    this.over = true; this.running = false
    this.cue('death'); this.say(reason.toUpperCase(), 'Run complete')
    const f = this.factors()
    const result: RunResult = {
      id: `${Date.now()}`, at: Date.now(), score: this.score(), sparks: this.sparks, maxMultiplier: this.maxMultiplier,
      factors: f, beacons: this.beacons.filter(b => b.lit).length, constellations: this.constellations.length,
      drones: this.dronesDefeated, titans: this.titansDefeated, distance: Math.round(this.distance), durationMs: Math.round(this.now * 1000),
      rigKey: this.opts.rigKey, paintKey: this.opts.paintKey, pilotKey: this.opts.pilotKey, callsign: this.opts.callsign,
    }
    setTimeout(() => this.onEnd?.(result), 1600)
  }

  // ------------------------------------------------------------------ HUD snapshot
  hud(): HudState {
    const p = this.player
    const nb = this.nearestBeacon
    let angle = 0
    if (nb) angle = wrapAngle(Math.atan2(nb.x - p.x, nb.z - p.z) - p.heading)
    return {
      sparks: this.sparks, score: this.score(), multiplier: this.totalMultiplier(), distance: Math.round(this.distance), timeLeft: Math.ceil(this.timeLeft),
      speedDisplay: Math.round(Math.abs(p.speed) * SPEED_DISPLAY), excitement: p.excitement,
      hull: Math.max(0, Math.round(p.hull)), maxHull: p.maxHull, shield: Math.round(p.shield), maxShield: p.maxShield,
      bolts: p.bolts, shockwaves: p.shockwaves, overdriveCharges: p.overdriveCharges, overdriveActive: this.now < p.overdriveUntil,
      factors: this.factors(), stage: this.stage, palette: this.palette,
      beaconsLit: this.beacons.filter(b => b.lit).length, beaconTotal: this.beacons.length, nearestBeaconAngle: angle, nearestBeaconDist: Math.round(this.nearestBeaconDist),
      relay: this.relay && !this.relay.done && !this.relay.failed ? { active: true, next: this.relay.next, total: this.relay.gates.length, timeLeft: Math.max(0, RELAY.timeLimitMs / 1000 - (this.now - this.relay.startedAt)) } : null,
      constellations: [...this.constellations],
      lockTarget: p.lockTarget !== null, lockProgress: p.lockProgress,
      dronesAlive: this.drones.length, running: this.running, paused: this.paused, over: this.over,
      message: this.message,
    }
  }
}
