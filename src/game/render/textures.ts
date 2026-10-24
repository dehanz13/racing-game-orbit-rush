import * as THREE from 'three'

/** Canvas-drawn textures so we ship no image files. */
const cache = new Map<string, THREE.Texture>()

export function blobShadow(): THREE.Texture {
  const key = 'blob'
  if (cache.has(key)) return cache.get(key)!
  const c = document.createElement('canvas'); c.width = c.height = 128
  const ctx = c.getContext('2d')!
  const g = ctx.createRadialGradient(64, 64, 4, 64, 64, 62)
  g.addColorStop(0, 'rgba(0,0,0,0.75)'); g.addColorStop(0.6, 'rgba(0,0,0,0.35)'); g.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = g; ctx.fillRect(0, 0, 128, 128)
  const t = new THREE.CanvasTexture(c); cache.set(key, t); return t
}

export function chevronPad(): THREE.Texture {
  const key = 'chevron'
  if (cache.has(key)) return cache.get(key)!
  const c = document.createElement('canvas'); c.width = c.height = 256
  const ctx = c.getContext('2d')!
  ctx.fillStyle = '#05060d'; ctx.fillRect(0, 0, 256, 256)
  ctx.strokeStyle = '#ffde42'; ctx.lineWidth = 16; ctx.lineCap = 'round'; ctx.lineJoin = 'round'
  for (let i = 0; i < 3; i++) {
    const y = 70 + i * 55
    ctx.beginPath(); ctx.moveTo(60, y + 30); ctx.lineTo(128, y); ctx.lineTo(196, y + 30); ctx.stroke()
  }
  ctx.strokeStyle = '#ffde42'; ctx.lineWidth = 10; ctx.strokeRect(12, 12, 232, 232)
  const t = new THREE.CanvasTexture(c); cache.set(key, t); return t
}

export function glowDot(): THREE.Texture {
  const key = 'glow'
  if (cache.has(key)) return cache.get(key)!
  const c = document.createElement('canvas'); c.width = c.height = 64
  const ctx = c.getContext('2d')!
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32)
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.4, 'rgba(255,255,255,0.5)'); g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g; ctx.fillRect(0, 0, 64, 64)
  const t = new THREE.CanvasTexture(c); cache.set(key, t); return t
}
