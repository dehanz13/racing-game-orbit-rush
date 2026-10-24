import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { CALLSIGNS, FactorKey, PILOTS, RIGS, rankForLevel, xpForLevel } from '@/config/game'

export type Screen = 'sound' | 'menu' | 'race' | 'results' | 'pilot' | 'garage' | 'about'

export interface RunResult {
  id: string
  at: number
  score: number
  sparks: number
  maxMultiplier: number
  factors: Record<FactorKey, number>
  beacons: number
  constellations: number
  drones: number
  titans: number
  distance: number
  durationMs: number
  rigKey: string
  paintKey: string
  pilotKey: string
  callsign: string
}

export interface LeaderboardEntry { id: string; name: string; team?: string; score: number; pilotKey: string; at: number }

export interface Settings {
  sound: boolean
  music: boolean
  quality: 'eco' | 'medium' | 'high'
  fpsCap: 60 | 30 | 0
  camera: 'auto' | 'side' | 'follow'
  nightMode: 'auto' | 'day' | 'night'
  controls: 'arrows' | 'wasd'
}

interface Profile {
  callsign: string
  pilotKey: string
  headgearKey: string
  rigKey: string
  paintKey: string
  level: number
  xp: number
  lifetimeScore: number
  constellationsEarned: string[]
  runs: number
}

interface GameState {
  screen: Screen
  raceId: number
  settings: Settings
  profile: Profile
  lastRun: RunResult | null
  bestRun: RunResult | null
  leaderboard: LeaderboardEntry[]
  modal: null | 'howto' | 'settings' | 'evaluation' | 'updates' | 'share' | 'pause' | 'exit'
  setScreen: (s: Screen) => void
  setModal: (m: GameState['modal']) => void
  updateSettings: (p: Partial<Settings>) => void
  updateProfile: (p: Partial<Profile>) => void
  randomCallsign: () => void
  recordRun: (r: RunResult) => { leveledUp: boolean; newLevel: number }
  clearResults: () => void
}

const seedBoard = (): LeaderboardEntry[] => {
  const names = ['Halley', 'Vega-7', 'Mireille', 'Oort', 'Cassini', 'Tycho', 'Luma', 'Perihelion', 'Kessler', 'Nova Kid']
  const teams = ['', 'Rift Crew', '', 'Null Set', '', '', 'Rift Crew', '', 'Parallax', '']
  return names.map((name, i) => ({
    id: `seed-${i}`,
    name,
    team: teams[i] || undefined,
    score: Math.round(1800 * Math.pow(0.8, i)),
    pilotKey: PILOTS[i % PILOTS.length].key,
    at: Date.now() - i * 86400000,
  }))
}

const randomName = () => `${CALLSIGNS[Math.floor(Math.random() * CALLSIGNS.length)]}-${Math.floor(100 + Math.random() * 900)}`

export const useGame = create<GameState>()(
  persist(
    (set, get) => ({
      screen: 'sound',
      raceId: 0,
      modal: null,
      settings: { sound: true, music: true, quality: 'high', fpsCap: 60, camera: 'auto', nightMode: 'auto', controls: 'arrows' },
      profile: {
        callsign: randomName(),
        pilotKey: PILOTS[4].key,
        headgearKey: 'none',
        rigKey: RIGS[0].key,
        paintKey: RIGS[0].paints[0].key,
        level: 1,
        xp: 0,
        lifetimeScore: 0,
        constellationsEarned: [],
        runs: 0,
      },
      lastRun: null,
      bestRun: null,
      leaderboard: seedBoard(),
      // raceId only changes when a race starts, so the race screen keeps its key (and engine) across other store updates
      setScreen: (screen) => set({ screen, modal: null, raceId: screen === 'race' ? get().raceId + 1 : get().raceId }),
      setModal: (modal) => set({ modal }),
      updateSettings: (p) => set({ settings: { ...get().settings, ...p } }),
      updateProfile: (p) => set({ profile: { ...get().profile, ...p } }),
      randomCallsign: () => set({ profile: { ...get().profile, callsign: randomName() } }),
      recordRun: (r) => {
        const { profile, bestRun, leaderboard } = get()
        // XP: every run feeds XP equal to its score; levels use the xpForLevel curve.
        let xp = profile.xp + r.score
        let level = profile.level
        let leveledUp = false
        while (xp >= xpForLevel(level)) { xp -= xpForLevel(level); level++; leveledUp = true }
        const board = [...leaderboard.filter(e => e.id !== 'you-best'), {
          id: 'you-best', name: profile.callsign, score: Math.max(r.score, bestRun?.score ?? 0), pilotKey: profile.pilotKey, at: Date.now(),
        }].sort((a, b) => b.score - a.score).slice(0, 25)
        set({
          lastRun: r,
          bestRun: !bestRun || r.score > bestRun.score ? r : bestRun,
          leaderboard: board,
          profile: { ...profile, xp, level, lifetimeScore: profile.lifetimeScore + r.score, runs: profile.runs + 1 },
        })
        return { leveledUp, newLevel: level }
      },
      clearResults: () => set({ lastRun: null, bestRun: null, leaderboard: get().leaderboard.filter(e => e.id !== 'you-best') }),
    }),
    { name: 'orbit-rush-v2', partialize: (s) => ({ settings: s.settings, profile: s.profile, lastRun: s.lastRun, bestRun: s.bestRun, leaderboard: s.leaderboard }) },
  ),
)

export const selectRankTitle = (s: GameState) => rankForLevel(s.profile.level)
