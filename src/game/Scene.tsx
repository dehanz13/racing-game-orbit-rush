import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { getEngine } from './session'
import { input } from './input'
import { audio } from './audio'
import { VEHICLE } from '@/config/game'
import { useGame } from '@/store/game'
import { perf } from './perf'
import { CarModel } from './render/CarModel'
import { Ground, Sky } from './render/Ground'
import { Pickups } from './render/Pickups'
import { Bolts, Drones } from './render/Drones'
import { Beacons, JumpPads, RelayGates } from './render/Beacons'
import { Effects, Exhaust, Popups } from './render/Effects'
import { Post, Studio } from './render/Post'

const tmpColor = new THREE.Color()

// Steps the engine first (priority -10); every other component then draws.
function GameLoop() {
  const settings = useGame(s => s.settings)
  useEffect(() => { input.attach(); return () => { input.detach(); audio.engineOff() } }, [])
  useFrame((_, dt) => {
    perf.frames++
    const e = getEngine(); if (!e) return
    e.step(dt, input)
    input.endFrame()
    e.flushCues()
    if (settings.sound) audio.engine(e.paused || e.over ? 0 : Math.min(1, Math.abs(e.player.speed) / (VEHICLE.maxSpeed * 1.6)))
  }, -10)
  return null
}

function PlayerRig() {
  const group = useRef<THREE.Group>(null!)
  const body = useRef<THREE.Mesh>(null!)
  const head = useRef<THREE.Group>(null!)
  const wheels = useRef<THREE.Mesh[]>([])
  const profile = useGame(s => s.profile)
  useFrame((state, dt) => {
    const e = getEngine(); if (!e) return
    const p = e.player
    group.current.position.set(p.x, p.y, p.z)
    group.current.rotation.y = p.heading
    const steer = (input.held.has('left') ? 1 : 0) - (input.held.has('right') ? 1 : 0) - input.steerAxis
    const lean = -steer * 0.1 * Math.min(1, Math.abs(p.speed) / 20)
    group.current.rotation.z = THREE.MathUtils.lerp(group.current.rotation.z, lean, dt * 8)
    group.current.rotation.x = THREE.MathUtils.lerp(group.current.rotation.x, -p.vy * 0.03, dt * 6)
    for (const w of wheels.current) if (w) w.rotation.x += p.speed * dt * 0.9
    const m = body.current?.material as THREE.MeshPhysicalMaterial | undefined
    if (m) {
      const boosting = e.now < p.overdriveUntil
      m.emissive.set(p.hitFlash > 0 ? '#ff2d6f' : boosting ? '#b7ff4a' : '#000000')
      m.emissiveIntensity = p.hitFlash > 0 ? p.hitFlash * 1.5 : boosting ? 0.5 + Math.sin(state.clock.elapsedTime * 30) * 0.3 : 0
    }
    if (head.current) head.current.position.y = 1.22 * 0.95 + 0.35 + Math.sin(state.clock.elapsedTime * (4 + p.excitement * 14)) * (0.03 + p.excitement * 0.1)
  })
  return (
    <CarModel ref={group} rigKey={profile.rigKey} paintKey={profile.paintKey} pilotKey={profile.pilotKey} headgearKey={profile.headgearKey} wheelsRef={wheels} bodyRef={body} headRef={head} />
  )
}

// "side" is the original's classic top-diagonal view; "follow" sits behind the car.
function FollowCamera() {
  const { camera } = useThree()
  const settings = useGame(s => s.settings)
  const pos = useMemo(() => new THREE.Vector3(0, 26, -22), [])
  const look = useMemo(() => new THREE.Vector3(), [])
  const shake = useRef(0)
  useFrame((_, dt) => {
    const e = getEngine(); if (!e) return
    const p = e.player
    const mode = settings.camera === 'auto' ? (e.stage % 2 === 0 ? 'side' : 'follow') : settings.camera
    const aheadX = Math.sin(p.heading) * Math.min(20, p.speed * 0.35), aheadZ = Math.cos(p.heading) * Math.min(20, p.speed * 0.35)
    if (mode === 'side') {
      pos.set(p.x + aheadX * 0.5 - 12, 24 + p.y * 0.3, p.z + aheadZ * 0.5 - 20)
      look.set(p.x + aheadX, 1 + p.y * 0.5, p.z + aheadZ)
    } else {
      pos.set(p.x - Math.sin(p.heading) * 16, 8 + p.y * 0.4, p.z - Math.cos(p.heading) * 16)
      look.set(p.x + aheadX, 1.5 + p.y * 0.5, p.z + aheadZ)
    }
    camera.position.lerp(pos, 1 - Math.pow(0.0015, dt))
    if (p.hitFlash > 0.9) shake.current = 0.6
    shake.current = Math.max(0, shake.current - dt * 2)
    camera.position.x += (Math.random() - 0.5) * shake.current
    camera.position.y += (Math.random() - 0.5) * shake.current
    camera.lookAt(look)
    const cam = camera as THREE.PerspectiveCamera
    cam.fov = THREE.MathUtils.lerp(cam.fov, 44 + (e.now < p.overdriveUntil ? 10 : 0) + Math.min(8, Math.abs(p.speed) * 0.12), dt * 3)
    cam.updateProjectionMatrix()
  })
  return null
}

function Lights() {
  const sun = useRef<THREE.DirectionalLight>(null!)
  const fill = useRef<THREE.DirectionalLight>(null!)
  const settings = useGame(s => s.settings)
  const { scene } = useThree()
  useFrame((_, dt) => {
    const e = getEngine(); if (!e) return
    const night = settings.nightMode === 'auto' ? e.stage % 2 === 1 : settings.nightMode === 'night'
    sun.current.position.set(e.player.x - 30, 60, e.player.z + 40)
    sun.current.target.position.set(e.player.x, 0, e.player.z)
    sun.current.target.updateMatrixWorld()
    sun.current.intensity = THREE.MathUtils.lerp(sun.current.intensity, night ? 0.8 : 1.9, dt * 2)
    fill.current.position.set(e.player.x + 40, 25, e.player.z - 30)
    fill.current.color.lerp(tmpColor.set(e.palette.accent), dt * 2)
    const fog = scene.fog as THREE.Fog
    fog.color.lerp(tmpColor.set(e.palette.fog), dt * 2)
  })
  return (
    <>
      <hemisphereLight args={['#c9d6ff', '#120a24', 0.35]} />
      <directionalLight ref={sun} castShadow intensity={2.6} color="#fff4e6" shadow-mapSize={[2048, 2048]} shadow-camera-left={-70} shadow-camera-right={70} shadow-camera-top={70} shadow-camera-bottom={-70} shadow-camera-near={1} shadow-camera-far={200} shadow-bias={-0.0004} shadow-normalBias={0.02} />
      <directionalLight ref={fill} intensity={0.6} color="#3af2ff" />
    </>
  )
}

function FpsCap() {
  const { invalidate } = useThree()
  const cap = useGame(s => s.settings.fpsCap)
  useEffect(() => {
    if (!cap) return
    const id = setInterval(() => invalidate(), 1000 / cap)
    return () => clearInterval(id)
  }, [cap, invalidate])
  return null
}

export default function Scene() {
  const quality = useGame(s => s.settings.quality)
  const cap = useGame(s => s.settings.fpsCap)
  const dpr = quality === 'eco' ? 1 : quality === 'medium' ? Math.min(1.5, window.devicePixelRatio) : Math.min(2, window.devicePixelRatio)
  return (
    <Canvas
      shadows={quality !== 'eco'}
      dpr={dpr}
      frameloop={cap ? 'demand' : 'always'}
      camera={{ fov: 44, near: 0.5, far: 600, position: [0, 24, -20] }}
      gl={{ antialias: quality === 'eco', powerPreference: 'high-performance', toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.05 }}
      onCreated={({ scene }) => { scene.fog = new THREE.Fog('#070a1a', 90, 330) }}
    >
      <FpsCap />
      <GameLoop />
      <Lights />
      <Studio />
      <FollowCamera />
      <Sky />
      <Ground />
      <PlayerRig />
      <Exhaust />
      <Drones />
      <Bolts />
      <Beacons />
      <RelayGates />
      <JumpPads />
      <Effects />
      <Popups />
      <Pickups />
      <Post quality={quality} />
    </Canvas>
  )
}
