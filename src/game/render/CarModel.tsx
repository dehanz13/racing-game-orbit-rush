import { forwardRef, useMemo } from 'react'
import * as THREE from 'three'
import { PILOTS, RIGS } from '@/config/game'
import { blobShadow } from './textures'

export interface CarLook { rigKey: string; paintKey: string; pilotKey: string; headgearKey: string }

/**
 * Procedural car: the body is a 2D side profile extruded across the width with
 * bevelled edges, so it reads as a real car silhouette instead of stacked boxes.
 * Forward is +z. The group origin sits on the ground under the car's centre.
 */
function bodyGeometry(length: number, width: number, height: number, sporty: number) {
  const L = length / 2
  const s = new THREE.Shape()
  // front is at -x in shape space; after rotateY(+90deg) it ends up at +z
  s.moveTo(-L, 0.28)
  s.lineTo(-L - 0.05, 0.55)
  s.lineTo(-L + 0.15, 0.72 * height)
  s.lineTo(-L + 1.25, 0.82 * height)                 // hood
  s.lineTo(-L + 1.9 + sporty * 0.2, 1.32 * height)   // windshield
  s.lineTo(L - 1.5, 1.38 * height)                   // roof
  s.lineTo(L - 0.7, 1.0 * height)                    // rear window
  s.lineTo(L - 0.05, 0.95 * height)                  // trunk
  s.lineTo(L + 0.05, 0.6)
  s.lineTo(L, 0.28)
  s.closePath()
  const g = new THREE.ExtrudeGeometry(s, { depth: width, bevelEnabled: true, bevelThickness: 0.1, bevelSize: 0.1, bevelSegments: 3, steps: 1 })
  g.center()
  g.rotateY(Math.PI / 2)
  g.computeBoundingBox()
  g.translate(0, -g.boundingBox!.min.y + 0.18, 0)
  return g
}

const wheelTire = new THREE.CylinderGeometry(0.44, 0.44, 0.38, 20)
const wheelRim = new THREE.CylinderGeometry(0.3, 0.3, 0.4, 10)
const wheelHub = new THREE.CylinderGeometry(0.1, 0.1, 0.42, 8)
wheelTire.rotateZ(Math.PI / 2); wheelRim.rotateZ(Math.PI / 2); wheelHub.rotateZ(Math.PI / 2)

export const CarModel = forwardRef<THREE.Group, CarLook & { wheelsRef?: React.MutableRefObject<THREE.Mesh[]>; bodyRef?: React.RefObject<THREE.Mesh>; headRef?: React.RefObject<THREE.Group>; lights?: boolean }>(
  function CarModel({ rigKey, paintKey, pilotKey, headgearKey, wheelsRef, bodyRef, headRef, lights = true }, ref) {
    const rig = RIGS.find(r => r.key === rigKey) ?? RIGS[0]
    const paint = rig.paints.find(p => p.key === paintKey) ?? rig.paints[0]
    const pilot = PILOTS.find(p => p.key === pilotKey) ?? PILOTS[0]
    const dims = useMemo(() => ({
      dart: { length: 4.4, width: 2.0, height: 0.95, sporty: 1 },
      bison: { length: 4.8, width: 2.5, height: 1.15, sporty: 0 },
      wraith: { length: 4.7, width: 2.1, height: 0.85, sporty: 1.4 },
      glacier: { length: 4.6, width: 2.6, height: 1.25, sporty: -0.3 },
    }[rigKey] ?? { length: 4.4, width: 2.0, height: 0.95, sporty: 1 }), [rigKey])
    const geom = useMemo(() => bodyGeometry(dims.length, dims.width, dims.height, dims.sporty), [dims])
    const shadowTex = useMemo(() => blobShadow(), [])
    const hw = dims.width / 2, hl = dims.length / 2
    const wheelY = 0.44
    const spoiler = rig.key === 'dart' || rig.key === 'wraith'
    return (
      <group ref={ref}>
        {/* paint body */}
        <mesh ref={bodyRef} geometry={geom} castShadow receiveShadow>
          <meshPhysicalMaterial color={paint.body} roughness={0.28} metalness={0.35} clearcoat={1} clearcoatRoughness={0.12} emissive={paint.glow} emissiveIntensity={0.06} />
        </mesh>
        {/* glass band */}
        <mesh position={[0, 1.08 * dims.height + 0.2, -0.1]} castShadow>
          <boxGeometry args={[dims.width - 0.25, 0.34, 2.1]} />
          <meshPhysicalMaterial color="#0a0e1c" roughness={0.05} metalness={0.9} clearcoat={1} />
        </mesh>
        {/* skirts / sills */}
        <mesh position={[0, 0.3, 0]}>
          <boxGeometry args={[dims.width + 0.08, 0.2, dims.length - 0.6]} />
          <meshStandardMaterial color="#111420" roughness={0.6} metalness={0.4} />
        </mesh>
        {/* trim stripe on the hood */}
        <mesh position={[0, 0.84 * dims.height + 0.16, hl - 1.2]} rotation-x={-0.08}>
          <boxGeometry args={[0.5, 0.02, 1.3]} />
          <meshStandardMaterial color={paint.trim} roughness={0.4} />
        </mesh>
        {/* spoiler */}
        {spoiler && (
          <group position={[0, 1.05 * dims.height + 0.1, -hl + 0.25]}>
            <mesh position={[0, 0.35, 0]} castShadow><boxGeometry args={[dims.width + 0.1, 0.07, 0.45]} /><meshStandardMaterial color={paint.trim} roughness={0.35} metalness={0.5} /></mesh>
            <mesh position={[hw - 0.35, 0.17, 0]}><boxGeometry args={[0.08, 0.35, 0.25]} /><meshStandardMaterial color="#111420" /></mesh>
            <mesh position={[-hw + 0.35, 0.17, 0]}><boxGeometry args={[0.08, 0.35, 0.25]} /><meshStandardMaterial color="#111420" /></mesh>
          </group>
        )}
        {/* head + tail lights */}
        {[1, -1].map(sx => (
          <group key={sx}>
            <mesh position={[sx * (hw - 0.45), 0.62, hl + 0.02]}>
              <boxGeometry args={[0.5, 0.18, 0.08]} />
              <meshBasicMaterial color="#fff8e1" toneMapped={false} />
            </mesh>
            <mesh position={[sx * (hw - 0.45), 0.62, -hl - 0.02]}>
              <boxGeometry args={[0.55, 0.14, 0.08]} />
              <meshBasicMaterial color="#ff2a2a" toneMapped={false} />
            </mesh>
            {/* exhaust tips */}
            <mesh position={[sx * 0.5, 0.32, -hl - 0.05]} rotation-x={Math.PI / 2}>
              <cylinderGeometry args={[0.09, 0.09, 0.25, 8]} />
              <meshStandardMaterial color="#9aa3b8" metalness={0.9} roughness={0.3} />
            </mesh>
          </group>
        ))}
        {/* wheels with rims */}
        {[[1, 1], [-1, 1], [1, -1], [-1, -1]].map(([sx, sz], i) => (
          <group key={i} position={[sx * (hw + 0.05), wheelY, sz * (hl - 0.85)]}>
            <mesh ref={el => { if (el && wheelsRef) wheelsRef.current[i] = el }} castShadow>
              <primitive object={wheelTire} attach="geometry" />
              <meshStandardMaterial color="#14151c" roughness={0.95} />
            </mesh>
            <mesh geometry={wheelRim}><meshStandardMaterial color="#c9d2e6" metalness={0.95} roughness={0.25} /></mesh>
            <mesh geometry={wheelHub}><meshStandardMaterial color={paint.trim} metalness={0.6} roughness={0.4} /></mesh>
            {/* fender */}
            <mesh position={[sx * -0.12, 0.25, 0]}>
              <boxGeometry args={[0.2, 0.3, 1.2]} />
              <meshStandardMaterial color="#111420" roughness={0.7} />
            </mesh>
          </group>
        ))}
        {/* pilot */}
        <group ref={headRef} position={[0, 1.22 * dims.height + 0.35, -0.25]}>
          <mesh castShadow><sphereGeometry args={[0.4, 20, 16]} /><meshStandardMaterial color={pilot.skin} roughness={0.55} /></mesh>
          {/* helmet shell */}
          <mesh position={[0, 0.08, -0.03]} rotation-x={-0.25}><sphereGeometry args={[0.43, 20, 16, 0, Math.PI * 2, 0, Math.PI * 0.62]} /><meshPhysicalMaterial color={pilot.color} roughness={0.25} clearcoat={1} /></mesh>
          {/* eyes */}
          <mesh position={[0.14, 0.02, 0.34]}><sphereGeometry args={[0.08, 10, 8]} /><meshBasicMaterial color="#ffffff" /></mesh>
          <mesh position={[-0.14, 0.02, 0.34]}><sphereGeometry args={[0.08, 10, 8]} /><meshBasicMaterial color="#ffffff" /></mesh>
          <mesh position={[0.14, 0.02, 0.4]}><sphereGeometry args={[0.035, 8, 6]} /><meshBasicMaterial color="#111" /></mesh>
          <mesh position={[-0.14, 0.02, 0.4]}><sphereGeometry args={[0.035, 8, 6]} /><meshBasicMaterial color="#111" /></mesh>
          {headgearKey === 'visor' && <mesh position={[0, 0.06, 0.3]}><boxGeometry args={[0.7, 0.2, 0.22]} /><meshPhysicalMaterial color="#061018" roughness={0.05} metalness={0.8} clearcoat={1} emissive="#19e6ff" emissiveIntensity={0.5} /></mesh>}
          {headgearKey === 'crest' && <mesh position={[0, 0.58, -0.05]} rotation-x={0.35}><coneGeometry args={[0.16, 0.6, 6]} /><meshStandardMaterial color={pilot.color} emissive={pilot.color} emissiveIntensity={0.4} /></mesh>}
          {headgearKey === 'halo' && <mesh position={[0, 0.62, 0]} rotation-x={Math.PI / 2}><torusGeometry args={[0.42, 0.05, 8, 28]} /><meshBasicMaterial color="#ffe066" toneMapped={false} /></mesh>}
        </group>
        {/* ground blob shadow */}
        <mesh rotation-x={-Math.PI / 2} position={[0, 0.03, 0]}>
          <planeGeometry args={[dims.width + 2.2, dims.length + 2.2]} />
          <meshBasicMaterial map={shadowTex} transparent depthWrite={false} opacity={0.7} />
        </mesh>
        {lights && (
          <>
            <pointLight position={[0, 0.25, 0]} color={paint.glow} intensity={2} distance={6} decay={2} />
            <spotLight position={[0, 0.7, hl]} target-position={[0, 0, hl + 20]} angle={0.42} penumbra={0.8} intensity={5} distance={26} color="#fff2cc" decay={1.8} />
          </>
        )}
      </group>
    )
  })
