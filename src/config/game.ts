/**
 * ORBIT RUSH — gameplay configuration.
 *
 * Every tunable number lives here (the original game did the same thing with one
 * big config object). The engine reads these values; the UI reads the LEX
 * dictionary so all player-facing vocabulary is in one place.
 */

// ---------------------------------------------------------------------------
// Vocabulary (the reskin). Change a word here and it changes everywhere.
// ---------------------------------------------------------------------------
export const LEX = {
  game: 'Orbit Rush',
  score: 'Pulse Score',
  like: 'Spark',
  likes: 'Sparks',
  goldLike: 'Gold Spark',
  trophy: 'Comet Core',
  trophies: 'Comet Cores',
  nomination: 'Beacon',
  nominations: 'Beacons',
  award: 'Constellation',
  awards: 'Constellations',
  rival: 'Drone',
  rivals: 'Drones',
  boss: 'Titan',
  bosses: 'Titans',
  rocket: 'Bolt',
  rockets: 'Bolts',
  boom: 'Shockwave',
  booms: 'Shockwaves',
  nitro: 'Overdrive',
  health: 'Hull',
  armor: 'Shield',
  story: 'Beacon trail',
  checkpointRoad: 'Relay Lane',
  present: 'Supply Crate',
} as const

// ---------------------------------------------------------------------------
// Controls
// ---------------------------------------------------------------------------
export const KEYS = {
  up: ['ArrowUp', 'KeyW'],
  down: ['ArrowDown', 'KeyS'],
  left: ['ArrowLeft', 'KeyA'],
  right: ['ArrowRight', 'KeyD'],
  fire: ['KeyF', 'KeyJ'],
  boom: ['KeyE', 'KeyK'],
  nitro: ['ShiftLeft', 'ShiftRight', 'KeyL'],
  jump: ['Space'],
  restart: ['KeyR'],
  pause: ['Escape', 'KeyP'],
} as const

// ---------------------------------------------------------------------------
// Vehicle physics (arcade model: speed + heading on a flat plane, plus a
// vertical axis for jumps). Units: metres and seconds.
// ---------------------------------------------------------------------------
export const VEHICLE = {
  maxSpeed: 42,          // m/s forward
  maxReverse: 10,
  accel: 22,             // m/s^2 when holding throttle
  brake: 36,
  drag: 0.985,           // per-tick velocity retention at 60 fps
  steerRate: 2.4,        // rad/s at low speed
  steerAtSpeed: 0.55,    // steering multiplier near max speed
  driftThresholdMs: 100, // (original) how long a hard turn must last to count as a drift
  airThresholdMs: 500,   // (original) air time needed before it counts as "flight"
  jump: { velocity: 9, gravity: 26, minSpeed: 4 }, // (original regularJump)
  jumpPad: { velocity: 17, gravity: 14.5 },        // (original salto)
  nitro: { multiplier: 1.6, durationMs: 2600, cooldownMs: 400 },
  baseHealth: 100,
  baseArmor: 0,
  maxArmor: 100,
  contactDamage: 12,     // ramming a drone
}

// ---------------------------------------------------------------------------
// Excitement — the hidden "hype" meter copied from the original. It rises
// with speed, drifting, air time and good events, decays constantly, and
// drives the Design factor plus the character's face/jump animations.
// ---------------------------------------------------------------------------
export const EXCITEMENT = {
  decayPerSecond: 0.08,
  events: { like: 0.2, presentBox: 0.5, cup: 0.75, projectileHitEnemy: 0.2, explosion: 0.4, carHit: -0.15 },
  speedThresholds: [
    { speed: 30, growthPerSecond: 0.05 },
    { speed: 55, growthPerSecond: 0.07 },
    { speed: 80, growthPerSecond: 0.085 },
  ],
  driftGrowthPerSecond: 0.085,
  airGrowthPerSecond: 0.07,
}
// NOTE: the original's speed thresholds are in km/h-ish display units. We show
// speed as `m/s * SPEED_DISPLAY` so the same thresholds apply.
export const SPEED_DISPLAY = 2.4

// ---------------------------------------------------------------------------
// Pickups ("collectables"). Each one maps to the original's set:
//   BlueLike → spark, OrangeLike → goldSpark, Goblet → comet, PresentBox → crate,
//   Energy → overdrive, Health/Shield → repair/shield, HealthUpgrade/ShieldUpgrade,
//   Multiplier125 → multiplier, Time → timeShard.
// ---------------------------------------------------------------------------
export type PickupKind =
  | 'spark' | 'goldSpark' | 'comet' | 'crate' | 'overdrive' | 'repair' | 'shield'
  | 'hullUpgrade' | 'shieldUpgrade' | 'multiplier' | 'timeShard'

export interface PickupDef {
  kind: PickupKind
  label: string
  popup: string
  color: string
  emissive: string
  weight: number      // spawn weight in the open world (0 = never spawns randomly)
  radius: number
}

export const PICKUPS: Record<PickupKind, PickupDef> = {
  spark:         { kind: 'spark',         label: LEX.like,       popup: '+1',     color: '#19e6ff', emissive: '#19e6ff', weight: 60, radius: 1.6 },
  goldSpark:     { kind: 'goldSpark',     label: LEX.goldLike,   popup: '+10',    color: '#ffc63a', emissive: '#ffb000', weight: 6,  radius: 1.8 },
  comet:         { kind: 'comet',         label: LEX.trophy,     popup: 'x1.75',  color: '#ff6a3d', emissive: '#ff3d00', weight: 0,  radius: 2.2 },
  crate:         { kind: 'crate',         label: LEX.present,    popup: 'x1.3',   color: '#f4f4ff', emissive: '#c7b7ff', weight: 0,  radius: 2.0 },
  overdrive:     { kind: 'overdrive',     label: LEX.nitro,      popup: '+N',     color: '#b7ff4a', emissive: '#7cff00', weight: 10, radius: 1.7 },
  repair:        { kind: 'repair',        label: LEX.health,     popup: '+Hull',  color: '#ff5f8a', emissive: '#ff2d6f', weight: 8,  radius: 1.7 },
  shield:        { kind: 'shield',        label: LEX.armor,      popup: '+Shield',color: '#8fd3ff', emissive: '#47b7ff', weight: 7,  radius: 1.7 },
  hullUpgrade:   { kind: 'hullUpgrade',   label: 'Hull upgraded',   popup: 'Hull Upgraded',   color: '#ffffff', emissive: '#2adf0d', weight: 0, radius: 2.0 },
  shieldUpgrade: { kind: 'shieldUpgrade', label: 'Shield upgraded', popup: 'Shield Upgraded', color: '#ffffff', emissive: '#51fff7', weight: 0, radius: 2.0 },
  multiplier:    { kind: 'multiplier',    label: 'Multiplier',   popup: 'x1.25',  color: '#1aff85', emissive: '#1aff85', weight: 2,  radius: 1.8 },
  timeShard:     { kind: 'timeShard',     label: 'Time shard',   popup: '+Time',  color: '#e3d62d', emissive: '#d80606', weight: 3,  radius: 1.7 },
}

export const PICKUP_EFFECTS = {
  spark: 1,
  goldSpark: 10,
  comet: 1.75,         // multiplier boost
  crate: 1.3,          // multiplier boost + 1 shockwave
  multiplier: 1.25,
  repair: 35,
  shield: 40,
  hullUpgrade: 25,     // +max hull
  shieldUpgrade: 25,   // +max shield
  timeShardSeconds: 15,
  multiplierDecayPerSecond: 0.04, // multipliers slowly settle back toward 1.0
}

// ---------------------------------------------------------------------------
// Weapons
// ---------------------------------------------------------------------------
export const WEAPONS = {
  boltsPerSparks: { every: 10, grant: 3 }, // "Every 10 Likes earn you 3 Rockets"
  bolt: { speed: 70, lifetimeMs: 2200, damage: 1, lockTimeMs: 350, lockRange: 90, homingTurn: 4.5 },
  shockwave: { radius: 28, damage: 3, cooldownMs: 700 },
  droneShot: { speed: 38, lifetimeMs: 2600, damage: 14, cooldownMs: 2400, range: 70 },
}

// ---------------------------------------------------------------------------
// Enemies
// ---------------------------------------------------------------------------
export const ENEMIES = {
  spawnRadius: { min: 90, max: 140 },
  maxDrones: [4, 6, 8, 10, 12],   // per stage
  drone: { health: 3, speed: 24, turn: 1.8, radius: 2.2, sparkDrop: 2 },
  titan: { health: 12, speed: 18, turn: 1.1, radius: 4.5, chance: 0.18 },
  allowTitan: [false, true, true, true, true], // (original allowBoss per stage)
  defeatCooldownMs: 1200,
}

// ---------------------------------------------------------------------------
// Stages: the world recolours as your Sparks total crosses thresholds.
// Each stage has three palettes; one is chosen at random per stage entry.
// ---------------------------------------------------------------------------
export interface Palette { ui: string; plane: string; edge: string; accent: string; fog: string }
export const STAGE_THRESHOLDS = [0, 40, 120, 280, 560]
export const STAGES: Palette[][] = [
  [
    { ui: 'ink',     plane: '#0b1026', edge: '#3af2ff', accent: '#3af2ff', fog: '#070a1a' },
    { ui: 'moss',    plane: '#0d1f1a', edge: '#8cff6a', accent: '#8cff6a', fog: '#071411' },
    { ui: 'slate',   plane: '#141a2e', edge: '#c8d2ff', accent: '#c8d2ff', fog: '#0c1020' },
  ],
  [
    { ui: 'violet',  plane: '#24104f', edge: '#d8b4ff', accent: '#d8b4ff', fog: '#160a30' },
    { ui: 'rose',    plane: '#4a0f3a', edge: '#ff6fd8', accent: '#ff6fd8', fog: '#2a0820' },
    { ui: 'jade',    plane: '#0a3a2a', edge: '#5bffc3', accent: '#5bffc3', fog: '#06241a' },
  ],
  [
    { ui: 'ember',   plane: '#3a1a08', edge: '#ffa43a', accent: '#ffa43a', fog: '#241005' },
    { ui: 'lagoon',  plane: '#083040', edge: '#4ae0ff', accent: '#4ae0ff', fog: '#051d28' },
    { ui: 'rust',    plane: '#4a0d0d', edge: '#ffb3b3', accent: '#ffb3b3', fog: '#2c0707' },
  ],
  [
    { ui: 'brass',   plane: '#1a1608', edge: '#ffe066', accent: '#ffe066', fog: '#0f0d04' },
    { ui: 'cobalt',  plane: '#07163a', edge: '#6fa8ff', accent: '#6fa8ff', fog: '#040d24' },
    { ui: 'plum',    plane: '#2a0a2e', edge: '#ff7bff', accent: '#ff7bff', fog: '#1a061c' },
  ],
  [
    { ui: 'sunset',  plane: '#5a2a12', edge: '#ffc38a', accent: '#ffc38a', fog: '#3a1a0a' },
    { ui: 'coral',   plane: '#5a2420', edge: '#ff8f7a', accent: '#ff8f7a', fog: '#3a1512' },
    { ui: 'solar',   plane: '#4a3a00', edge: '#fff07a', accent: '#fff07a', fog: '#2e2400' },
  ],
]

// ---------------------------------------------------------------------------
// Beacons (the original's 24 "story pieces"/venues). Visiting a Beacon adds
// a multiplier that scales with its number — later ones matter more.
// ---------------------------------------------------------------------------
export const BEACONS = {
  count: 24,
  spiralStep: 95,        // metres between successive beacons along the spiral
  radius: 9,             // trigger radius
  multiplierPerIndex: 0.035, // beacon #n adds 1 + n*this to the run multiplier
  revisitCooldownMs: 25000,  // (original generationCooldownAfterVisitMs)
}

// Relay Lanes (the original's checkpoint roads): a short chain of gates.
export const RELAY = {
  gates: 5,
  gateSpacing: 26,
  gateHalfWidth: 7,
  timeLimitMs: 14000,
  rewardComet: true,
}

export const JUMP_PADS = { perChunk: 0.12, halfSize: 4 }

// ---------------------------------------------------------------------------
// World generation: the plane is infinite; content is generated per chunk
// from a hash of the chunk coordinates so the same place always has the same
// pickups until you collect them.
// ---------------------------------------------------------------------------
export const WORLD = {
  chunkSize: 48,
  viewChunks: 3,          // chunks loaded in each direction
  pickupsPerChunk: 6,
  safeRadius: 20,         // no enemies spawn this close
}

// ---------------------------------------------------------------------------
// Performance factors (the original's four weighted traits, re-labelled).
// Weights 40/30/20/10 exactly as the original's Evaluation System states.
// ---------------------------------------------------------------------------
export type FactorKey = 'velocity' | 'control' | 'flair' | 'reach'
export const FACTORS: { key: FactorKey; label: string; weight: number; hint: string }[] = [
  { key: 'velocity', label: 'Velocity', weight: 0.4, hint: 'Speed, drifts and air time keep your hype high.' },
  { key: 'control',  label: 'Control',  weight: 0.3, hint: 'Bolt accuracy and clean Relay Lanes.' },
  { key: 'flair',    label: 'Flair',    weight: 0.2, hint: 'Variety: different pickups, jumps, Shockwaves.' },
  { key: 'reach',    label: 'Reach',    weight: 0.1, hint: 'Beacons lit and distance covered.' },
]

// Flavour nicknames shown next to a factor on the results screen, picked by
// the factor's percentile band (the original shows e.g. "Design (Hunter)").
export const FACTOR_NICKNAMES = ['Rookie', 'Scout', 'Seeker', 'Rider', 'Hunter', 'Ace', 'Maestro', 'Legend']

// ---------------------------------------------------------------------------
// Characters: six "pilot" themes, each with base factor stats (copied values).
// ---------------------------------------------------------------------------
export interface PilotTheme { key: string; label: string; color: string; skin: string; base: Record<FactorKey, number> }
export const PILOTS: PilotTheme[] = [
  { key: 'amber',  label: 'Amber',  color: '#ffb000', skin: '#ffd37a', base: { velocity: 70, control: 55, flair: 40, reach: 35 } },
  { key: 'ruby',   label: 'Ruby',   color: '#ff2d6f', skin: '#ff8fb0', base: { velocity: 35, control: 70, flair: 55, reach: 40 } },
  { key: 'orchid', label: 'Orchid', color: '#c06bff', skin: '#e0b8ff', base: { velocity: 40, control: 35, flair: 70, reach: 55 } },
  { key: 'cyan',   label: 'Cyan',   color: '#19e6ff', skin: '#9df2ff', base: { velocity: 55, control: 40, flair: 35, reach: 70 } },
  { key: 'lime',   label: 'Lime',   color: '#8cff6a', skin: '#d2ffc4', base: { velocity: 50, control: 51, flair: 52, reach: 53 } },
  { key: 'pearl',  label: 'Pearl',  color: '#f4f4ff', skin: '#ffffff', base: { velocity: 60, control: 61, flair: 62, reach: 63 } },
]

export const PILOT_HEADGEAR = [
  { key: 'none',   label: 'No headgear' },
  { key: 'visor',  label: 'Visor',  bonus: { control: 10 } },
  { key: 'crest',  label: 'Crest',  bonus: { flair: 10, velocity: -5 } },
  { key: 'halo',   label: 'Halo',   bonus: { reach: 10 } },
] as const

// Random callsigns (original ships a list of ~80 "default names").
export const CALLSIGNS = ['Newcomer','Rookie','Runner','Starter','Seeker','Explorer','Scout','Entrant','Contender','Challenger','Candidate','Recruit','Wanderer','Drifter','Rider','Pilot','Sprinter','Chaser','Hunter','Roamer','Strider','Dasher','Mover','Maker','Dreamer','Thinker','Builder','Tinkerer','Shaper','Curator','Visionary','Talent','Ace','Expert','Veteran','Pro','Elite','Champion','Finalist','Hotshot','Virtuoso','Maestro','Legend','Underdog','Striver','Stranger','Visitor','Tourist','Intern','Junior','Fellow','Buddy','Newbie','Comet','Nebula','Quasar','Pulsar']

// ---------------------------------------------------------------------------
// Cars ("rigs"): four bodies, three paint jobs each (original: blaze/rhino/
// phantom/blizzard). Stats shape the arcade physics multipliers.
// ---------------------------------------------------------------------------
export interface RigDef {
  key: string; name: string; tagline: string
  stats: { speed: number; grip: number; hull: number }   // multipliers
  paints: { key: string; label: string; body: string; trim: string; glow: string }[]
}
export const RIGS: RigDef[] = [
  { key: 'dart', name: 'Dart', tagline: 'Light, quick, and hard to pin down.',
    stats: { speed: 1.08, grip: 1.0, hull: 0.85 },
    paints: [
      { key: 'crimson', label: 'Dart crimson', body: '#b4122e', trim: '#ffd37a', glow: '#ff5f8a' },
      { key: 'acid',    label: 'Dart acid',    body: '#c9ff3c', trim: '#0a4a22', glow: '#8cff6a' },
      { key: 'ivory',   label: 'Dart ivory',   body: '#f1e3c8', trim: '#5f2a00', glow: '#ffffff' },
    ] },
  { key: 'bison', name: 'Bison', tagline: 'Heavy, steady, built to shrug off hits.',
    stats: { speed: 0.92, grip: 0.95, hull: 1.3 },
    paints: [
      { key: 'tangerine', label: 'Bison tangerine', body: '#ff7a1a', trim: '#b8c8d9', glow: '#ffb347' },
      { key: 'navy',      label: 'Bison navy',      body: '#0b1d4a', trim: '#84bfff', glow: '#6fa8ff' },
      { key: 'bone',      label: 'Bison bone',      body: '#f5dcbf', trim: '#5f2a00', glow: '#ffffff' },
    ] },
  { key: 'wraith', name: 'Wraith', tagline: 'Blazing speed. Questionable brakes.',
    stats: { speed: 1.18, grip: 0.85, hull: 0.8 },
    paints: [
      { key: 'graphite', label: 'Wraith graphite', body: '#8d8d93', trim: '#d93636', glow: '#c8d2ff' },
      { key: 'gold',     label: 'Wraith gold',     body: '#ffc93c', trim: '#aa470d', glow: '#ffe066' },
      { key: 'scarlet',  label: 'Wraith scarlet',  body: '#c40c00', trim: '#570101', glow: '#ff3d00' },
    ] },
  { key: 'glacier', name: 'Glacier', tagline: 'Barely moves. Never breaks.',
    stats: { speed: 0.82, grip: 1.1, hull: 1.5 },
    paints: [
      { key: 'ice',   label: 'Glacier ice',   body: '#2d7ac2', trim: '#ffb675', glow: '#4ae0ff' },
      { key: 'berry', label: 'Glacier berry', body: '#c53a5c', trim: '#170000', glow: '#ff6fd8' },
      { key: 'snow',  label: 'Glacier snow',  body: '#ffe5bf', trim: '#7a0d0d', glow: '#ffffff' },
    ] },
]

// ---------------------------------------------------------------------------
// Progression: Level is XP-based; Rank is a title band over levels.
// ---------------------------------------------------------------------------
export const xpForLevel = (level: number) => Math.round(150 * Math.pow(level, 1.45))
export const RANKS = [
  { minLevel: 1,  title: 'Cadet' },
  { minLevel: 3,  title: 'Pilot' },
  { minLevel: 6,  title: 'Navigator' },
  { minLevel: 10, title: 'Ace' },
  { minLevel: 15, title: 'Commander' },
  { minLevel: 22, title: 'Legend' },
]
export const rankForLevel = (level: number) =>
  [...RANKS].reverse().find(r => level >= r.minLevel)?.title ?? RANKS[0].title

// Constellations (the original's "awards"): earned by reaching a Pulse Score
// in a single run. The header shows a strip of earned ones during the race.
export const CONSTELLATIONS = [
  { key: 'spark',   label: 'First Light', score: 50 },
  { key: 'comet',   label: 'Comet Tail',  score: 200 },
  { key: 'orbit',   label: 'Full Orbit',  score: 500 },
  { key: 'nova',    label: 'Nova',        score: 1200 },
  { key: 'quasar',  label: 'Quasar',      score: 2500 },
  { key: 'galaxy',  label: 'Galaxy',      score: 5000 },
]

export const SCORE = {
  perRival: 3,
  perTitan: 12,
  perBeacon: 5,
}

export const RUN = {
  baseTimeSeconds: 150,   // run ends when the clock hits zero or the hull is gone
}
