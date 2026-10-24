import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { ENEMIES } from '@/config/game'
import { getEngine } from '../session'
import { blobShadow } from './textures'

const tmpObj = new THREE.Object3D()
const tmpColor = new THREE.Color()

/** Drones: armoured body + spinning ring + glowing eye, all instanced. */
function Swarm({ titan }: { titan: boolean }) {
  const body = useRef<THREE.InstancedMesh>(null!)
  const ring = useRef<THREE.InstancedMesh>(null!)
  const eye = useRef<THREE.InstancedMesh>(null!)
  const shadow = useRef<THREE.InstancedMesh>(null!)
  const r = titan ? ENEMIES.titan.radius * 0.8 : ENEMIES.drone.radius * 0.75
  const max = titan ? 4 : 24
  const shadowTex = useMemo(() => blobShadow(), [])
  useFrame((state) => {
    const e = getEngine(); if (!e) return
    const t = state.clock.elapsedTime
    let i = 0
    for (const d of e.drones) {
      if (d.titan !== titan) continue
      const y = (titan ? 3 : 1.9) + Math.sin(t * 3 + d.id) * 0.3
      tmpObj.position.set(d.x, y, d.z); tmpObj.rotation.set(Math.sin(t + d.id) * 0.2, d.heading, Math.cos(t * 1.3 + d.id) * 0.15)
      tmpObj.scale.setScalar(1 + d.hitFlash * 0.2); tmpObj.updateMatrix()
      body.current.setMatrixAt(i, tmpObj.matrix)
      body.current.setColorAt(i, tmpColor.set(d.hitFlash > 0 ? '#ffffff' : (titan ? '#2a1a12' : '#1a1226')))
      tmpObj.rotation.set(Math.PI / 2 + Math.sin(t * 2 + d.id) * 0.4, 0, t * (titan ? 1.5 : 3)); tmpObj.scale.setScalar(1); tmpObj.updateMatrix()
      ring.current.setMatrixAt(i, tmpObj.matrix)
      tmpObj.rotation.set(0, d.heading, 0); tmpObj.position.set(d.x + Math.sin(d.heading) * r * 0.9, y, d.z + Math.cos(d.heading) * r * 0.9); tmpObj.scale.setScalar(1); tmpObj.updateMatrix()
      eye.current.setMatrixAt(i, tmpObj.matrix)
      tmpObj.position.set(d.x, 0.04, d.z); tmpObj.rotation.set(-Math.PI / 2, 0, 0); tmpObj.scale.setScalar(titan ? 2.2 : 1.3); tmpObj.updateMatrix()
      shadow.current.setMatrixAt(i, tmpObj.matrix)
      i++
    }
    for (const m of [body, ring, eye, shadow]) { m.current.count = i; m.current.instanceMatrix.needsUpdate = true }
    if (body.current.instanceColor) body.current.instanceColor.needsUpdate = true
  })
  const accent = titan ? '#ff8f3a' : '#ff3d6f'
  return (
    <>
      <instancedMesh ref={body} args={[undefined, undefined, max]} castShadow frustumCulled={false}>
        {titan ? <dodecahedronGeometry args={[r, 0]} /> : <icosahedronGeometry args={[r, 0]} />}
        <meshPhysicalMaterial color="#1a1226" roughness={0.35} metalness={0.8} clearcoat={0.6} emissive={accent} emissiveIntensity={0.15} flatShading />
      </instancedMesh>
      <instancedMesh ref={ring} args={[undefined, undefined, max]} frustumCulled={false}>
        <torusGeometry args={[r * 1.35, titan ? 0.16 : 0.1, 8, 28]} />
        <meshBasicMaterial color={accent} toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={eye} args={[undefined, undefined, max]} frustumCulled={false}>
        <sphereGeometry args={[titan ? 0.55 : 0.35, 12, 10]} />
        <meshBasicMaterial color="#ff2020" toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={shadow} args={[undefined, undefined, max]} frustumCulled={false}>
        <planeGeometry args={[4, 4]} />
        <meshBasicMaterial map={shadowTex} transparent depthWrite={false} opacity={0.55} />
      </instancedMesh>
    </>
  )
}

function LockRing() {
  const ring = useRef<THREE.Mesh>(null!)
  useFrame((state) => {
    const e = getEngine(); if (!e) return
    const target = e.player.lockTarget !== null ? e.drones.find(d => d.id === e.player.lockTarget) : null
    ring.current.visible = !!target
    if (target) { ring.current.position.set(target.x, 0.15, target.z); ring.current.scale.setScalar((target.titan ? 2.4 : 1.5) * (1.5 - e.player.lockProgress * 0.5)); ring.current.rotation.z = state.clock.elapsedTime * 3 }
  })
  return (
    <mesh ref={ring} rotation-x={-Math.PI / 2}>
      <ringGeometry args={[2.1, 2.5, 4]} />
      <meshBasicMaterial color="#ff6767" toneMapped={false} transparent opacity={0.95} side={THREE.DoubleSide} />
    </mesh>
  )
}

export function Drones() {
  return <><Swarm titan={false} /><Swarm titan /><LockRing /></>
}

/** Player bolts (bright capsules with a tail) and drone shots (red orbs). */
export function Bolts() {
  const mine = useRef<THREE.InstancedMesh>(null!)
  const tail = useRef<THREE.InstancedMesh>(null!)
  const theirs = useRef<THREE.InstancedMesh>(null!)
  useFrame(() => {
    const e = getEngine(); if (!e) return
    let a = 0, b = 0
    for (const bolt of e.bolts) {
      const yaw = Math.atan2(bolt.vx, bolt.vz)
      tmpObj.position.set(bolt.x, bolt.y, bolt.z); tmpObj.rotation.set(Math.PI / 2, yaw, 0, 'YXZ'); tmpObj.scale.setScalar(1); tmpObj.updateMatrix()
      if (bolt.player) {
        mine.current.setMatrixAt(a, tmpObj.matrix)
        tmpObj.position.set(bolt.x - Math.sin(yaw) * 2.2, bolt.y, bolt.z - Math.cos(yaw) * 2.2); tmpObj.scale.set(0.6, 1, 0.6); tmpObj.updateMatrix()
        tail.current.setMatrixAt(a, tmpObj.matrix); a++
      } else { theirs.current.setMatrixAt(b++, tmpObj.matrix) }
    }
    mine.current.count = a; tail.current.count = a; theirs.current.count = b
    mine.current.instanceMatrix.needsUpdate = true; tail.current.instanceMatrix.needsUpdate = true; theirs.current.instanceMatrix.needsUpdate = true
  })
  return (
    <>
      <instancedMesh ref={mine} args={[undefined, undefined, 64]} frustumCulled={false}>
        <capsuleGeometry args={[0.18, 1.6, 4, 8]} />
        <meshBasicMaterial color="#bff7ff" toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={tail} args={[undefined, undefined, 64]} frustumCulled={false}>
        <coneGeometry args={[0.25, 3.5, 8]} />
        <meshBasicMaterial color="#19e6ff" transparent opacity={0.45} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={theirs} args={[undefined, undefined, 64]} frustumCulled={false}>
        <sphereGeometry args={[0.45, 10, 8]} />
        <meshBasicMaterial color="#ff4040" toneMapped={false} />
      </instancedMesh>
    </>
  )
}
