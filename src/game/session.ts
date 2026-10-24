import { Engine, EngineOptions } from './engine'
import { useEffect, useState } from 'react'

/** One engine per race. UI and the 3D scene both read this. */
let current: Engine | null = null

export const startSession = (opts: EngineOptions) => {
  current = new Engine(opts)
  // Dev convenience: poke at the live engine from the console (window.__engine)
  if (import.meta.env.DEV) (window as any).__engine = current
  return current
}
export const getEngine = () => current
export const endSession = () => { current = null }

/** Poll the engine's HUD snapshot at ~12 Hz for React overlays. */
export function useHud(hz = 12) {
  const [hud, setHud] = useState(() => current?.hud() ?? null)
  useEffect(() => {
    const id = setInterval(() => { if (current) setHud(current.hud()) }, 1000 / hz)
    return () => clearInterval(id)
  }, [hz])
  return hud
}
