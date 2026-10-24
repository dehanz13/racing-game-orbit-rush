import { KEYS } from '@/config/game'

export type Action = keyof typeof KEYS

/**
 * Keyboard + touch input, read by the engine every frame.
 * `held` is the live state; `pressed` is edge-triggered (consumed once).
 */
export class Input {
  held = new Set<Action>()
  pressed = new Set<Action>()
  steerAxis = 0      // touch joystick: -1..1
  throttleAxis = 0   // touch joystick: -1..1
  private map = new Map<string, Action>()

  constructor() {
    for (const [action, codes] of Object.entries(KEYS)) for (const c of codes) this.map.set(c, action as Action)
  }

  attach() {
    window.addEventListener('keydown', this.onDown)
    window.addEventListener('keyup', this.onUp)
    window.addEventListener('blur', this.clear)
  }
  detach() {
    window.removeEventListener('keydown', this.onDown)
    window.removeEventListener('keyup', this.onUp)
    window.removeEventListener('blur', this.clear)
  }
  clear = () => { this.held.clear(); this.pressed.clear() }

  private onDown = (e: KeyboardEvent) => {
    const a = this.map.get(e.code)
    if (!a) return
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault()
    if (!this.held.has(a)) this.pressed.add(a)
    this.held.add(a)
  }
  private onUp = (e: KeyboardEvent) => {
    const a = this.map.get(e.code)
    if (a) this.held.delete(a)
  }

  // Touch helpers used by the on-screen controls
  press(a: Action) { if (!this.held.has(a)) this.pressed.add(a); this.held.add(a) }
  release(a: Action) { this.held.delete(a) }

  consume(a: Action) { const had = this.pressed.has(a); this.pressed.delete(a); return had }
  endFrame() { this.pressed.clear() }
}

export const input = new Input()
