import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { PICKUPS, PickupKind } from '@/config/game'
import { getEngine } from '../session'

const tmpObj = new THREE.Object3D()
const tmpColor = new THREE.Color()
const MAX = 700

function star(points = 5, outer = 1.1, inner = 0.5) {
  const s = new THREE.Shape()
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outer : inner, a = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2
    i === 0 ? s.moveTo(Math.cos(a) * r, Math.sin(a) * r) : s.lineTo(Math.cos(a) * r, Math.sin(a) * r)
  }
  s.closePath()
  return new THREE.ExtrudeGeometry(s, { depth: 0.35, bevelEnabled: true, bevelSize: 0.08, bevelThickness: 0.08, bevelSegments: 2 }).center()
}
function cross(arm = 1.0, thick = 0.38) {
  const s = new THREE.Shape()
  const t = thick / 2
  s.moveTo(-t, -arm); s.lineTo(t, -arm); s.lineTo(t, -t); s.lineTo(arm, -t); s.lineTo(arm, t); s.lineTo(t, t); s.lineTo(t, arm); s.lineTo(-t, arm); s.lineTo(-t, t); s.lineTo(-arm, t); s.lineTo(-arm, -t); s.lineTo(-t, -t); s.closePath()
  return new THREE.ExtrudeGeometry(s, { depth: 0.4, bevelEnabled: true, bevelSize: 0.06, bevelThickness: 0.06, bevelSegments: 2 }).center()
}
function hourglass() {
  const pts: THREE.Vector2[] = []
  for (let i = 0; i <= 12; i++) { const t = i / 12; const y = t * 2.2 - 1.1; const r = 0.15 + Math.abs(y) * 0.75; pts.push(new THREE.Vector2(r, y)) }
  return new THREE.LatheGeometry(pts, 12)
}

/** Each pickup kind has a metallic "shell" and a bright emissive "core". */
const defs: Record<PickupKind, { shell: () => THREE.BufferGeometry; core: () => THREE.BufferGeometry; spin: 'y' | 'tumble' | 'flat'; coreScale?: number }> = {
  spark:         { shell: () => new THREE.TorusGeometry(0.85, 0.2, 10, 24), core: () => new THREE.SphereGeometry(0.34, 12, 10), spin: 'flat' },
  goldSpark:     { shell: () => star(), core: () => new THREE.SphereGeometry(0.3, 12, 10), spin: 'y' },
  comet:         { shell: () => { const g = new THREE.ConeGeometry(0.9, 2.3, 8); g.rotateX(Math.PI / 2); return g }, core: () => new THREE.TorusGeometry(1.1, 0.12, 8, 24), spin: 'y' },
  crate:         { shell: () => new THREE.BoxGeometry(1.5, 1.5, 1.5), core: () => new THREE.BoxGeometry(1.58, 0.34, 1.58), spin: 'tumble' },
  overdrive:     { shell: () => new THREE.CylinderGeometry(0.55, 0.55, 1.6, 14), core: () => new THREE.CylinderGeometry(0.58, 0.58, 0.5, 14), spin: 'y', coreScale: 1 },
  repair:        { shell: () => cross(), core: () => new THREE.SphereGeometry(0.28, 10, 8), spin: 'y' },
  shield:        { shell: () => { const g = new THREE.CylinderGeometry(1.0, 1.0, 0.45, 6); g.rotateX(Math.PI / 2); return g }, core: () => new THREE.SphereGeometry(0.32, 10, 8), spin: 'y' },
  hullUpgrade:   { shell: () => cross(1.2, 0.45), core: () => new THREE.TorusGeometry(1.35, 0.08, 8, 28), spin: 'y' },
  shieldUpgrade: { shell: () => { const g = new THREE.CylinderGeometry(1.2, 1.2, 0.5, 6); g.rotateX(Math.PI / 2); return g }, core: () => new THREE.TorusGeometry(1.5, 0.08, 8, 28), spin: 'y' },
  multiplier:    { shell: () => { const g = new THREE.OctahedronGeometry(1.0, 0); g.scale(0.8, 1.4, 0.8); return g }, core: () => new THREE.SphereGeometry(0.3, 10, 8), spin: 'y' },
  timeShard:     { shell: () => hourglass(), core: () => new THREE.SphereGeometry(0.22, 10, 8), spin: 'y' },
}

function Layer({ kind }: { kind: PickupKind }) {
  const shell = useRef<THREE.InstancedMesh>(null!)
  const core = useRef<THREE.InstancedMesh>(null!)
  const d = defs[kind]
  const shellGeom = useMemo(() => d.shell(), [kind])
  const coreGeom = useMemo(() => d.core(), [kind])
  const def = PICKUPS[kind]
  useFrame((state) => {
    const e = getEngine(); if (!e) return
    const t = state.clock.elapsedTime
    let i = 0
    for (const p of e.allPickups()) {
      if (p.kind !== kind || i >= MAX) continue
      const bob = Math.sin(t * 2.2 + p.phase) * 0.22
      tmpObj.position.set(p.x, p.y + 0.3 + bob, p.z)
      if (d.spin === 'flat') tmpObj.rotation.set(Math.PI / 2 + Math.sin(t * 1.3 + p.phase) * 0.35, 0, t * 1.2 + p.phase)
      else if (d.spin === 'tumble') tmpObj.rotation.set(t * 0.8 + p.phase, t * 1.1, 0)
      else tmpObj.rotation.set(0, t * 1.6 + p.phase, 0)
      tmpObj.scale.setScalar(1)
      tmpObj.updateMatrix()
      shell.current.setMatrixAt(i, tmpObj.matrix)
      // core: counter-rotates, pulses
      tmpObj.rotation.set(d.spin === 'flat' ? Math.PI / 2 : 0, -t * 2 + p.phase, 0)
      tmpObj.scale.setScalar((d.coreScale ?? 1) * (0.9 + 0.15 * Math.sin(t * 5 + p.phase)))
      tmpObj.updateMatrix()
      core.current.setMatrixAt(i, tmpObj.matrix)
      i++
    }
    shell.current.count = i; core.current.count = i
    shell.current.instanceMatrix.needsUpdate = true; core.current.instanceMatrix.needsUpdate = true
  })
  return (
    <>
      <instancedMesh ref={shell} args={[shellGeom, undefined, MAX]} castShadow frustumCulled={false}>
        <meshPhysicalMaterial color={def.color} emissive={def.emissive} emissiveIntensity={0.25} roughness={0.25} metalness={0.7} clearcoat={0.8} />
      </instancedMesh>
      <instancedMesh ref={core} args={[coreGeom, undefined, MAX]} frustumCulled={false}>
        <meshBasicMaterial color={tmpColor.set(def.emissive).multiplyScalar(1.6).getHex()} toneMapped={false} />
      </instancedMesh>
    </>
  )
}

/** Soft coloured ring under every pickup so they feel anchored to the floor. */
function GroundRings() {
  const ref = useRef<THREE.InstancedMesh>(null!)
  useFrame((state) => {
    const e = getEngine(); if (!e) return
    const t = state.clock.elapsedTime
    let i = 0
    for (const p of e.allPickups()) {
      if (i >= MAX) break
      tmpObj.position.set(p.x, 0.04, p.z); tmpObj.rotation.set(-Math.PI / 2, 0, 0)
      tmpObj.scale.setScalar(1.2 + 0.1 * Math.sin(t * 3 + p.phase)); tmpObj.updateMatrix()
      ref.current.setMatrixAt(i, tmpObj.matrix)
      ref.current.setColorAt(i, tmpColor.set(PICKUPS[p.kind].emissive))
      i++
    }
    ref.current.count = i; ref.current.instanceMatrix.needsUpdate = true
    if (ref.current.instanceColor) ref.current.instanceColor.needsUpdate = true
  })
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, MAX]} frustumCulled={false}>
      <ringGeometry args={[0.9, 1.15, 24]} />
      <meshBasicMaterial transparent opacity={0.45} depthWrite={false} blending={THREE.AdditiveBlending} />
    </instancedMesh>
  )
}

export function Pickups() {
  return (
    <>
      <GroundRings />
      {(Object.keys(defs) as PickupKind[]).map(k => <Layer key={k} kind={k} />)}
    </>
  )
}
