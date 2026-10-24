import { EffectComposer, Bloom, Vignette, ChromaticAberration } from '@react-three/postprocessing'
import { Environment, Lightformer } from '@react-three/drei'
import { BlendFunction } from 'postprocessing'
import * as THREE from 'three'

/** Procedural studio environment: a few light panels for reflections on paint and floor. */
export function Studio() {
  return (
    <Environment resolution={128} frames={1} background={false}>
      <Lightformer intensity={1.4} color="#dfe8ff" position={[0, 12, 0]} rotation-x={Math.PI / 2} scale={[20, 20, 1]} />
      <Lightformer intensity={1.2} color="#19e6ff" position={[-12, 4, -6]} rotation-y={Math.PI / 2} scale={[14, 3, 1]} />
      <Lightformer intensity={1.2} color="#ff3da6" position={[12, 4, 6]} rotation-y={-Math.PI / 2} scale={[14, 3, 1]} />
      <Lightformer intensity={0.6} color="#ffffff" position={[0, 2, 16]} scale={[10, 2, 1]} />
    </Environment>
  )
}

export function Post({ quality }: { quality: 'eco' | 'medium' | 'high' }) {
  if (quality === 'eco') return null
  return (
    <EffectComposer multisampling={quality === 'high' ? 4 : 0} enableNormalPass={false}>
      <Bloom luminanceThreshold={0.85} luminanceSmoothing={0.15} intensity={quality === 'high' ? 0.75 : 0.55} mipmapBlur radius={0.55} />
      <ChromaticAberration offset={new THREE.Vector2(0.0008, 0.0008)} blendFunction={BlendFunction.NORMAL} radialModulation modulationOffset={0.4} />
      <Vignette eskil={false} offset={0.25} darkness={0.6} />
    </EffectComposer>
  )
}
