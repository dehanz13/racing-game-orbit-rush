import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { getEngine } from '../session'

const tmp = new THREE.Color()

/**
 * Lit, slightly glossy floor. The grid is injected into a MeshPhysicalMaterial
 * via onBeforeCompile so the floor still receives light, shadows, fog and
 * environment reflections. Lines are drawn from world coordinates, so the
 * plane can follow the car without anything visibly moving.
 */
export function Ground({ palette, follow = true }: { palette?: { plane: string; edge: string }; follow?: boolean }) {
  const mesh = useRef<THREE.Mesh>(null!)
  const uniforms = useMemo(() => ({
    uPlane: { value: new THREE.Color(palette?.plane ?? '#0b1026') },
    uEdge: { value: new THREE.Color(palette?.edge ?? '#3af2ff') },
    uTime: { value: 0 },
    uPulse: { value: 0 },
    uPulseCenter: { value: new THREE.Vector2() },
  }), [])
  const material = useMemo(() => {
    const m = new THREE.MeshPhysicalMaterial({ color: '#ffffff', roughness: 0.6, metalness: 0.1, clearcoat: 0.25, clearcoatRoughness: 0.6, envMapIntensity: 0.3 })
    m.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, uniforms)
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vWorldPos;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;')
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', `#include <common>
          varying vec3 vWorldPos;
          uniform vec3 uPlane; uniform vec3 uEdge; uniform float uTime; uniform float uPulse; uniform vec2 uPulseCenter;
          float gridLine(vec2 p, float cell, float w, float soft) {
            vec2 g = abs(fract(p / cell - 0.5) - 0.5) * cell;
            float d = min(g.x, g.y);
            return 1.0 - smoothstep(w, w + soft, d);
          }`)
        .replace('#include <color_fragment>', `#include <color_fragment>
          float major = gridLine(vWorldPos.xz, 20.0, 0.16, 0.28);
          float minor = gridLine(vWorldPos.xz, 5.0, 0.05, 0.12);
          vec2 gm = abs(fract(vWorldPos.xz / 20.0 - 0.5) - 0.5) * 20.0;
          float halo = exp(-min(gm.x, gm.y) * 0.9);
          // tiles get slightly darker toward their centre
          vec2 cc = abs(fract(vWorldPos.xz / 20.0) - 0.5) * 2.0;
          float centre = 1.0 - max(cc.x, cc.y);
          vec3 base = uPlane * (0.55 + 0.25 * (1.0 - centre * 0.6));
          base = mix(base, uEdge, minor * 0.10);
          diffuseColor.rgb = mix(base, uEdge, major * 0.25);`)
        .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
          float r = length(vWorldPos.xz - uPulseCenter);
          float ring = smoothstep(uPulse - 4.0, uPulse, r) * (1.0 - smoothstep(uPulse, uPulse + 4.0, r)) * step(0.01, uPulse) * (1.0 - uPulse / 90.0);
          float sweep = 0.5 + 0.5 * sin(vWorldPos.z * 0.04 + vWorldPos.x * 0.02 - uTime * 0.6);
          totalEmissiveRadiance += uEdge * (major * (0.28 + 0.14 * sweep) + halo * 0.06 + minor * 0.03 + ring * 0.9);`)
    }
    m.customProgramCacheKey = () => 'orbit-ground'
    return m
  }, [uniforms])
  const pulse = useRef({ r: 0, x: 0, z: 0, seen: new Set<number>() })
  useFrame((state, dt) => {
    uniforms.uTime.value = state.clock.elapsedTime
    const e = getEngine()
    if (e && follow) {
      mesh.current.position.set(e.player.x, 0, e.player.z)
      ;(uniforms.uPlane.value as THREE.Color).lerp(tmp.set(e.palette.plane), dt * 2)
      ;(uniforms.uEdge.value as THREE.Color).lerp(tmp.set(e.palette.edge), dt * 2)
      const fx = e.effects.find(f => f.kind === 'beacon' && !pulse.current.seen.has(f.id))
      if (fx) pulse.current = { r: 0.1, x: fx.x, z: fx.z, seen: pulse.current.seen.add(fx.id) }
      if (pulse.current.r > 0) { pulse.current.r += dt * 70; if (pulse.current.r > 90) pulse.current.r = 0 }
      uniforms.uPulse.value = pulse.current.r
      ;(uniforms.uPulseCenter.value as THREE.Vector2).set(pulse.current.x, pulse.current.z)
    } else if (palette) {
      ;(uniforms.uPlane.value as THREE.Color).lerp(tmp.set(palette.plane), dt * 2)
      ;(uniforms.uEdge.value as THREE.Color).lerp(tmp.set(palette.edge), dt * 2)
    }
  })
  return (
    <mesh ref={mesh} rotation-x={-Math.PI / 2} receiveShadow material={material}>
      <planeGeometry args={[760, 760]} />
    </mesh>
  )
}

/** Gradient sky dome with a sprinkle of stars; sits inside the fog distance. */
export function Sky({ follow = true }: { follow?: boolean }) {
  const mesh = useRef<THREE.Mesh>(null!)
  const mat = useMemo(() => new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { uTop: { value: new THREE.Color('#141b45') }, uBottom: { value: new THREE.Color('#070a1a') }, uTime: { value: 0 } },
    vertexShader: `varying vec3 vPos; void main(){ vPos = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `
      uniform vec3 uTop; uniform vec3 uBottom; uniform float uTime; varying vec3 vPos;
      float hash(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
      void main(){
        vec3 d = normalize(vPos);
        float h = clamp(d.y, 0.0, 1.0);
        vec3 c = mix(uBottom, uTop, pow(h, 0.6));
        // stars: cells on the direction vector
        vec3 cell = floor(d * 140.0);
        float s = hash(cell);
        float star = step(0.992, s) * h;
        float tw = 0.6 + 0.4 * sin(uTime * 2.0 + s * 60.0);
        c += vec3(star * tw * 0.9);
        gl_FragColor = vec4(c, 1.0);
      }`,
  }), [])
  useFrame((state, dt) => {
    mat.uniforms.uTime.value = state.clock.elapsedTime
    const e = getEngine()
    if (e && follow) {
      mesh.current.position.set(e.player.x, 0, e.player.z)
      ;(mat.uniforms.uBottom.value as THREE.Color).lerp(tmp.set(e.palette.fog), dt * 2)
      ;(mat.uniforms.uTop.value as THREE.Color).lerp(tmp.set(e.palette.plane).multiplyScalar(1.6), dt * 2)
    }
  })
  return <mesh ref={mesh} material={mat}><sphereGeometry args={[500, 32, 16]} /></mesh>
}
