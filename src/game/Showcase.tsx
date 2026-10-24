import { Canvas, useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import * as THREE from 'three'
import { CarModel } from './render/CarModel'
import { Ground, Sky } from './render/Ground'
import { Post, Studio } from './render/Post'
import { useGame } from '@/store/game'
import { PILOTS, RIGS } from '@/config/game'

/**
 * Turntable scene used behind the menu and in the garage / pilot screens.
 * `focus` moves the camera: 'car' orbits the whole rig, 'pilot' frames the head.
 */
function Turntable({ focus, spin }: { focus: 'car' | 'pilot' | 'menu'; spin: boolean }) {
  const group = useRef<THREE.Group>(null!)
  const profile = useGame(s => s.profile)
  const wheels = useRef<THREE.Mesh[]>([])
  useFrame((state, dt) => {
    const t = state.clock.elapsedTime
    if (group.current) {
      group.current.rotation.y = spin ? t * 0.35 : THREE.MathUtils.lerp(group.current.rotation.y, 0.4, dt * 3)
      group.current.position.y = Math.sin(t * 1.4) * 0.04
    }
    for (const w of wheels.current) if (w) w.rotation.x += dt * 2
    const cam = state.camera
    const target = focus === 'pilot' ? new THREE.Vector3(3.2, 2.6, 4.2) : focus === 'menu' ? new THREE.Vector3(-9.5, 3.8, 10.5) : new THREE.Vector3(6.5, 3.2, 8)
    cam.position.lerp(target, dt * 2)
    cam.lookAt(focus === 'menu' ? -1.5 : 0, focus === 'pilot' ? 1.6 : 0.9, 0)
  })
  return (
    <group ref={group}>
      <CarModel rigKey={profile.rigKey} paintKey={profile.paintKey} pilotKey={profile.pilotKey} headgearKey={profile.headgearKey} wheelsRef={wheels} lights={false} />
    </group>
  )
}

export default function Showcase({ focus = 'car', spin = true }: { focus?: 'car' | 'pilot' | 'menu'; spin?: boolean }) {
  const profile = useGame(s => s.profile)
  const quality = useGame(s => s.settings.quality)
  const rig = RIGS.find(r => r.key === profile.rigKey) ?? RIGS[0]
  const paint = rig.paints.find(p => p.key === profile.paintKey) ?? rig.paints[0]
  const pilot = PILOTS.find(p => p.key === profile.pilotKey) ?? PILOTS[0]
  const accent = focus === 'pilot' ? pilot.color : paint.glow
  return (
    <Canvas shadows={quality !== 'eco'} dpr={Math.min(1.5, window.devicePixelRatio)} camera={{ fov: 38, near: 0.3, far: 600, position: [7, 3.4, 9] }}
      gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.05 }}
      onCreated={({ scene }) => { scene.fog = new THREE.Fog('#070a1a', 40, 160) }}>
      <hemisphereLight args={['#c9d6ff', '#120a24', 0.5]} />
      <directionalLight castShadow position={[-8, 14, 10]} intensity={2.4} color="#fff4e6" shadow-mapSize={[1024, 1024]} shadow-camera-left={-12} shadow-camera-right={12} shadow-camera-top={12} shadow-camera-bottom={-12} />
      <directionalLight position={[10, 6, -8]} intensity={1.2} color={accent} />
      <pointLight position={[0, 0.3, 0]} color={accent} intensity={4} distance={8} />
      <Studio />
      <Sky follow={false} />
      <Ground follow={false} palette={{ plane: '#0b1026', edge: accent }} />
      <Turntable focus={focus} spin={spin} />
      <Post quality={quality === 'eco' ? 'eco' : 'medium'} />
    </Canvas>
  )
}
