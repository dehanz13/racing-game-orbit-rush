import { useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import { getEngine } from '../session'
import { input } from '../input'
import { glowDot } from './textures'

const tmpObj = new THREE.Object3D()
const tmpColor = new THREE.Color()

/** Expanding rings + a bright flash disc for explosions, shockwaves and beacon pulses. */
export function Effects() {
  const rings = useRef<THREE.Mesh[]>([])
  const flashes = useRef<THREE.Mesh[]>([])
  useFrame(() => {
    const e = getEngine(); if (!e) return
    for (let i = 0; i < 24; i++) {
      const m = rings.current[i], f = flashes.current[i]; if (!m || !f) continue
      const fx = e.effects[i]
      m.visible = !!fx; f.visible = !!fx && fx.kind !== 'spawn'
      if (!fx) continue
      const life = fx.kind === 'shock' ? 0.5 : fx.kind === 'beacon' ? 1.2 : 0.7
      const age = (e.now - fx.bornAt) / life
      m.position.set(fx.x, 0.5, fx.z)
      m.scale.setScalar(Math.max(0.01, fx.radius * Math.min(1, age)))
      const mat = m.material as THREE.MeshBasicMaterial
      mat.color.set(fx.color); mat.opacity = Math.max(0, 1 - age)
      f.position.set(fx.x, fx.kind === 'beacon' ? 15 : 2, fx.z)
      f.scale.setScalar(fx.radius * (0.6 + age * 0.8))
      const fm = f.material as THREE.MeshBasicMaterial
      fm.color.set(fx.color); fm.opacity = Math.max(0, 0.9 - age * 1.4)
    }
  })
  const dot = useMemo(() => glowDot(), [])
  return (
    <>
      {Array.from({ length: 24 }, (_, i) => (
        <group key={i}>
          <mesh ref={el => { if (el) rings.current[i] = el }} rotation-x={-Math.PI / 2} visible={false}>
            <ringGeometry args={[0.78, 1, 40]} />
            <meshBasicMaterial transparent opacity={0.8} side={THREE.DoubleSide} depthWrite={false} toneMapped={false} blending={THREE.AdditiveBlending} />
          </mesh>
          <sprite ref={el => { if (el) flashes.current[i] = el as unknown as THREE.Mesh }} visible={false}>
            <spriteMaterial map={dot} transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
          </sprite>
        </group>
      ))}
    </>
  )
}

/** Exhaust / overdrive particles streaming from the back of the car. */
export function Exhaust() {
  const ref = useRef<THREE.InstancedMesh>(null!)
  const pool = useMemo(() => Array.from({ length: 120 }, () => ({ x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, life: 0, max: 1, size: 1, hot: false })), [])
  const next = useRef(0)
  useFrame((_, dt) => {
    const e = getEngine(); if (!e) return
    const p = e.player
    const boosting = e.now < p.overdriveUntil
    const throttle = input.held.has('up') || input.throttleAxis > 0.2 || boosting
    const rate = boosting ? 80 : throttle ? 22 : 3
    let spawn = rate * dt
    while (spawn > 0 && !e.paused && !e.over) {
      if (Math.random() > spawn) break
      spawn -= 1
      const part = pool[next.current++ % pool.length]
      const side = Math.random() < 0.5 ? 0.5 : -0.5
      part.x = p.x - Math.sin(p.heading) * 2.3 + Math.cos(p.heading) * side
      part.z = p.z - Math.cos(p.heading) * 2.3 - Math.sin(p.heading) * side
      part.y = 0.35 + p.y
      part.vx = -Math.sin(p.heading) * (6 + Math.random() * 4) + (Math.random() - 0.5) * 2
      part.vz = -Math.cos(p.heading) * (6 + Math.random() * 4) + (Math.random() - 0.5) * 2
      part.vy = 0.8 + Math.random() * 1.5
      part.max = boosting ? 0.45 : 0.6; part.life = part.max; part.size = boosting ? 0.32 : 0.16; part.hot = boosting
    }
    let i = 0
    for (const part of pool) {
      if (part.life <= 0) continue
      part.life -= dt; part.x += part.vx * dt; part.z += part.vz * dt; part.y += part.vy * dt; part.vy -= 0.5 * dt
      const k = part.life / part.max
      tmpObj.position.set(part.x, part.y, part.z); tmpObj.scale.setScalar(part.size * (1.6 - k)); tmpObj.updateMatrix()
      ref.current.setMatrixAt(i, tmpObj.matrix)
      ref.current.setColorAt(i, part.hot ? tmpColor.set('#b7ff4a').lerp(tmpColor.clone().set('#ffffff'), k) : tmpColor.set('#8c93a8').multiplyScalar(0.3 + k * 0.7))
      i++
    }
    ref.current.count = i; ref.current.instanceMatrix.needsUpdate = true
    if (ref.current.instanceColor) ref.current.instanceColor.needsUpdate = true
  })
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, 120]} frustumCulled={false}>
      <sphereGeometry args={[1, 8, 6]} />
      <meshBasicMaterial transparent opacity={0.4} depthWrite={false} toneMapped={false} />
    </instancedMesh>
  )
}

/** Floating "+1 / x1.75" popups (HTML anchored in 3D). */
export function Popups() {
  const [items, setItems] = useState<{ id: number; text: string; color: string; x: number; y: number; z: number }[]>([])
  const frame = useRef(0)
  useFrame(() => {
    const e = getEngine(); if (!e) return
    if (frame.current++ % 4 !== 0) return
    const nextItems = e.popups.map(p => ({ id: p.id, text: p.text, color: p.color, x: p.x, y: p.y, z: p.z }))
    setItems(prev => (prev.length === nextItems.length && prev.every((p, i) => p.id === nextItems[i].id)) ? prev : nextItems)
  })
  return (
    <>
      {items.map(p => (
        <Html key={p.id} position={[p.x, p.y + 2, p.z]} center style={{ pointerEvents: 'none' }} zIndexRange={[5, 0]}>
          <div className="popup" style={{ color: p.color }}>{p.text}</div>
        </Html>
      ))}
    </>
  )
}
