import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import { BEACONS, JUMP_PADS, RELAY } from '@/config/game'
import { getEngine } from '../session'
import { chevronPad } from './textures'

const tmpObj = new THREE.Object3D()

/** 24 beacon towers: base, segmented column, crystal, halo, and a light beam when lit. */
export function Beacons() {
  const groups = useRef<THREE.Group[]>([])
  const crystals = useRef<THREE.MeshBasicMaterial[]>([])
  const beams = useRef<THREE.MeshBasicMaterial[]>([])
  const rings = useRef<THREE.MeshStandardMaterial[]>([])
  const crystalMeshes = useRef<THREE.Mesh[]>([])
  useFrame((state) => {
    const e = getEngine(); if (!e) return
    const t = state.clock.elapsedTime
    e.beacons.forEach((b, i) => {
      const g = groups.current[i]; if (!g) return
      g.position.set(b.x, 0, b.z)
      const accent = b.lit ? e.palette.accent : '#8a93b8'
      crystals.current[i]?.color.set(accent)
      if (beams.current[i]) beams.current[i].opacity = b.lit ? 0.18 + Math.sin(t * 4) * 0.05 : 0.03
      rings.current[i]?.emissive.set(accent)
      if (rings.current[i]) rings.current[i].emissiveIntensity = b.lit ? 1.6 : 0.35
      const c = crystalMeshes.current[i]
      if (c) { c.rotation.y = t * (b.lit ? 1.5 : 0.4); c.position.y = 15.2 + Math.sin(t * 2 + i) * 0.3 }
    })
  })
  return (
    <>
      {Array.from({ length: BEACONS.count }, (_, i) => (
        <group key={i} ref={el => { if (el) groups.current[i] = el }}>
          <mesh position={[0, 0.2, 0]} receiveShadow><cylinderGeometry args={[5, 5.6, 0.4, 8]} /><meshStandardMaterial color="#121a33" roughness={0.6} metalness={0.4} /></mesh>
          <mesh position={[0, 0.65, 0]}><cylinderGeometry args={[2.4, 3, 0.5, 8]} /><meshStandardMaterial color="#1a2347" roughness={0.5} metalness={0.5} /></mesh>
          <mesh position={[0, 7, 0]} castShadow><cylinderGeometry args={[0.7, 1.4, 13, 8]} /><meshStandardMaterial color="#1c2448" roughness={0.45} metalness={0.6} /></mesh>
          {[3, 7, 11].map(y => (
            <mesh key={y} position={[0, y, 0]} rotation-x={Math.PI / 2}><torusGeometry args={[1.5 - y * 0.05, 0.12, 8, 24]} /><meshStandardMaterial ref={el => { if (el && y === 7) rings.current[i] = el }} color="#1a2347" emissive="#8a93b8" emissiveIntensity={0.35} metalness={0.6} roughness={0.3} /></mesh>
          ))}
          <mesh ref={el => { if (el) crystalMeshes.current[i] = el }} position={[0, 15.2, 0]}><octahedronGeometry args={[1.5, 0]} /><meshBasicMaterial ref={el => { if (el) crystals.current[i] = el }} color="#8a93b8" toneMapped={false} /></mesh>
          <mesh position={[0, 35, 0]}><cylinderGeometry args={[0.9, 1.6, 50, 12, 1, true]} /><meshBasicMaterial ref={el => { if (el) beams.current[i] = el }} color="#ffffff" transparent opacity={0.03} depthWrite={false} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} /></mesh>
          <mesh rotation-x={-Math.PI / 2} position={[0, 0.45, 0]}><ringGeometry args={[BEACONS.radius - 0.6, BEACONS.radius, 48]} /><meshBasicMaterial color="#ffffff" transparent opacity={0.3} side={THREE.DoubleSide} depthWrite={false} /></mesh>
          <Html position={[0, 18.5, 0]} center distanceFactor={70} style={{ pointerEvents: 'none' }}>
            <div className="beacon-tag">{i + 1}</div>
          </Html>
        </group>
      ))}
    </>
  )
}

/** Relay gates: arch + posts + a lit stripe on the floor. */
export function RelayGates() {
  const refs = useRef<THREE.Group[]>([])
  useFrame((state) => {
    const e = getEngine(); if (!e) return
    const r = e.relay
    const t = state.clock.elapsedTime
    for (let i = 0; i < RELAY.gates; i++) {
      const g = refs.current[i]; if (!g) continue
      const gate = r && !r.done && !r.failed ? r.gates[i] : null
      g.visible = !!gate
      if (!gate) continue
      g.position.set(gate.x, 0, gate.z); g.rotation.y = gate.heading
      const isNext = i === r!.next
      const col = gate.passed ? '#8cff6a' : isNext ? '#ffe066' : '#ffffff'
      g.children.forEach(c => { const m = (c as THREE.Mesh).material as THREE.MeshBasicMaterial; if (m?.color) { m.color.set(col); if ('opacity' in m && m.transparent) m.opacity = isNext ? 0.35 + Math.sin(t * 6) * 0.15 : 0.15 } })
    }
  })
  return (
    <>
      {Array.from({ length: RELAY.gates }, (_, i) => (
        <group key={i} ref={el => { if (el) refs.current[i] = el }} visible={false}>
          <mesh position={[0, 3.4, 0]}><torusGeometry args={[RELAY.gateHalfWidth, 0.22, 8, 36, Math.PI]} /><meshBasicMaterial color="#ffffff" toneMapped={false} /></mesh>
          <mesh position={[RELAY.gateHalfWidth, 1.7, 0]}><boxGeometry args={[0.45, 3.4, 0.45]} /><meshBasicMaterial color="#ffffff" toneMapped={false} /></mesh>
          <mesh position={[-RELAY.gateHalfWidth, 1.7, 0]}><boxGeometry args={[0.45, 3.4, 0.45]} /><meshBasicMaterial color="#ffffff" toneMapped={false} /></mesh>
          <mesh rotation-x={-Math.PI / 2} position={[0, 0.06, 0]}><planeGeometry args={[RELAY.gateHalfWidth * 2, 3]} /><meshBasicMaterial color="#ffffff" transparent opacity={0.15} depthWrite={false} blending={THREE.AdditiveBlending} /></mesh>
        </group>
      ))}
    </>
  )
}

export function JumpPads() {
  const ref = useRef<THREE.InstancedMesh>(null!)
  const rim = useRef<THREE.InstancedMesh>(null!)
  const tex = useMemo(() => chevronPad(), [])
  useFrame(() => {
    const e = getEngine(); if (!e) return
    let i = 0
    for (const p of e.allPads()) {
      if (i >= 120) break
      tmpObj.position.set(p.x, 0.1, p.z); tmpObj.rotation.set(-Math.PI / 2, 0, p.heading); tmpObj.scale.setScalar(1); tmpObj.updateMatrix()
      ref.current.setMatrixAt(i, tmpObj.matrix)
      tmpObj.position.set(p.x, 0.05, p.z); tmpObj.rotation.set(0, p.heading, 0); tmpObj.updateMatrix()
      rim.current.setMatrixAt(i, tmpObj.matrix)
      i++
    }
    ref.current.count = i; rim.current.count = i
    ref.current.instanceMatrix.needsUpdate = true; rim.current.instanceMatrix.needsUpdate = true
  })
  const s = JUMP_PADS.halfSize * 2
  return (
    <>
      <instancedMesh ref={ref} args={[undefined, undefined, 120]} frustumCulled={false}>
        <planeGeometry args={[s, s]} />
        <meshStandardMaterial map={tex} emissiveMap={tex} emissive="#ffffff" emissiveIntensity={1.2} roughness={0.5} />
      </instancedMesh>
      <instancedMesh ref={rim} args={[undefined, undefined, 120]} frustumCulled={false} receiveShadow>
        <boxGeometry args={[s + 0.6, 0.12, s + 0.6]} />
        <meshStandardMaterial color="#1a1a22" metalness={0.6} roughness={0.4} />
      </instancedMesh>
    </>
  )
}
