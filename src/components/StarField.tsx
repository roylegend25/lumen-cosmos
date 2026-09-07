import { useRef, useMemo } from 'react'
import { useFrame, Canvas, useThree } from '@react-three/fiber'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import * as THREE from 'three'

/* Custom shader materials — multi-layer luminous particle field
   Deep field + spiral arms + core glow (premium, not basic Points) */

const starVertexShader = /* glsl */ `
  attribute float aSize;
  attribute float aAlpha;
  attribute float aTwinkle;
  varying float vAlpha;
  varying float vTwinkle;
  uniform float uTime;
  uniform float uPixelRatio;

  void main() {
    vAlpha = aAlpha;
    vTwinkle = aTwinkle;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    float twinkle = 0.7 + 0.3 * sin(uTime * aTwinkle + aAlpha * 12.0);
    gl_PointSize = aSize * uPixelRatio * twinkle * (300.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`

const starFragmentShader = /* glsl */ `
  varying float vAlpha;
  varying float vTwinkle;
  uniform vec3 uColor;
  uniform float uTime;

  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    float d = length(uv);
    float core = smoothstep(0.5, 0.0, d);
    float halo = smoothstep(0.5, 0.15, d) * 0.35;
    float alpha = (core + halo) * vAlpha;
    vec3 col = uColor + vec3(0.12, 0.06, 0.18) * core;
    gl_FragColor = vec4(col, alpha);
  }
`

const spiralVertexShader = /* glsl */ `
  attribute float aSize;
  attribute float aPhase;
  attribute float aArm;
  varying float vAlpha;
  varying float vPhase;
  uniform float uTime;
  uniform float uPixelRatio;

  void main() {
    vPhase = aPhase;
    float t = uTime * 0.08 + aPhase;
    vec3 pos = position;
    float angle = atan(pos.z, pos.x) + t * 0.15 * (1.0 - aArm * 0.3);
    float r = length(pos.xz);
    pos.x = cos(angle) * r;
    pos.z = sin(angle) * r;
    pos.y += sin(t * 1.2 + aPhase * 6.0) * 0.15;
    vAlpha = 0.45 + 0.55 * smoothstep(0.0, 0.5, 1.0 - r / 28.0);
    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_PointSize = aSize * uPixelRatio * (220.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`

const spiralFragmentShader = /* glsl */ `
  varying float vAlpha;
  varying float vPhase;
  uniform vec3 uColor;
  uniform vec3 uColorHot;
  uniform float uTime;

  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    float d = length(uv);
    float core = smoothstep(0.45, 0.0, d);
    float halo = smoothstep(0.5, 0.1, d) * 0.5;
    float pulse = 0.85 + 0.15 * sin(uTime * 1.5 + vPhase * 8.0);
    vec3 col = mix(uColor, uColorHot, core * 0.6);
    float alpha = (core + halo) * vAlpha * pulse;
    gl_FragColor = vec4(col, alpha);
  }
`

function DeepField({ count = 4000 }: { count?: number }) {
  const ref = useRef<THREE.Points>(null)
  const material = useRef<THREE.ShaderMaterial>(null)

  const { positions, sizes, alphas, twinkles } = useMemo(() => {
    const positions = new Float32Array(count * 3)
    const sizes = new Float32Array(count)
    const alphas = new Float32Array(count)
    const twinkles = new Float32Array(count)
    for (let i = 0; i < count; i++) {
      const r = 40 + Math.pow(Math.random(), 0.6) * 90
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta)
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
      positions[i * 3 + 2] = r * Math.cos(phi)
      sizes[i] = 0.4 + Math.random() * 1.8
      alphas[i] = 0.15 + Math.random() * 0.55
      twinkles[i] = 0.5 + Math.random() * 2.5
    }
    return { positions, sizes, alphas, twinkles }
  }, [count])

  useFrame((state) => {
    if (material.current) material.current.uniforms.uTime.value = state.clock.elapsedTime
    if (ref.current) {
      ref.current.rotation.y = state.clock.elapsedTime * 0.004
      ref.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.002) * 0.03
    }
  })

  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    g.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1))
    g.setAttribute('aAlpha', new THREE.BufferAttribute(alphas, 1))
    g.setAttribute('aTwinkle', new THREE.BufferAttribute(twinkles, 1))
    return g
  }, [positions, sizes, alphas, twinkles])

  return (
    <points ref={ref} geometry={geo} frustumCulled={false}>
      <shaderMaterial
        ref={material}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        vertexShader={starVertexShader}
        fragmentShader={starFragmentShader}
        uniforms={{
          uTime: { value: 0 },
          uPixelRatio: { value: typeof window !== 'undefined' ? Math.min(window.devicePixelRatio, 2) : 1 },
          uColor: { value: new THREE.Color('#c8c0e8') },
        }}
      />
    </points>
  )
}

function SpiralArms({ count = 3200 }: { count?: number }) {
  const ref = useRef<THREE.Points>(null)
  const material = useRef<THREE.ShaderMaterial>(null)

  const { positions, sizes, phases, arms } = useMemo(() => {
    const positions = new Float32Array(count * 3)
    const sizes = new Float32Array(count)
    const phases = new Float32Array(count)
    const arms = new Float32Array(count)
    const ARM_COUNT = 3
    for (let i = 0; i < count; i++) {
      const arm = i % ARM_COUNT
      const t = Math.random()
      const r = 1.5 + t * 26
      const theta = arm * ((Math.PI * 2) / ARM_COUNT) + t * 3.8 + (Math.random() - 0.5) * 0.35
      const y = (Math.random() - 0.5) * (1.2 + t * 2.5)
      positions[i * 3] = Math.cos(theta) * r
      positions[i * 3 + 1] = y
      positions[i * 3 + 2] = Math.sin(theta) * r
      sizes[i] = 0.6 + Math.random() * 2.2 * (1 - t * 0.4)
      phases[i] = Math.random()
      arms[i] = arm / ARM_COUNT
    }
    return { positions, sizes, phases, arms }
  }, [count])

  useFrame((state) => {
    if (material.current) material.current.uniforms.uTime.value = state.clock.elapsedTime
    if (ref.current) ref.current.rotation.y = state.clock.elapsedTime * 0.012
  })

  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    g.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1))
    g.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1))
    g.setAttribute('aArm', new THREE.BufferAttribute(arms, 1))
    return g
  }, [positions, sizes, phases, arms])

  return (
    <points ref={ref} geometry={geo} frustumCulled={false}>
      <shaderMaterial
        ref={material}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        vertexShader={spiralVertexShader}
        fragmentShader={spiralFragmentShader}
        uniforms={{
          uTime: { value: 0 },
          uPixelRatio: { value: typeof window !== 'undefined' ? Math.min(window.devicePixelRatio, 2) : 1 },
          uColor: { value: new THREE.Color('#8b7cf7') },
          uColorHot: { value: new THREE.Color('#e8d4ff') },
        }}
      />
    </points>
  )
}

const glowVertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const glowFragmentShader = /* glsl */ `
  uniform vec3 uColor;
  uniform float uIntensity;
  uniform float uFalloff;
  varying vec2 vUv;

  void main() {
    float d = length(vUv - 0.5) * 2.0;
    float a = pow(clamp(1.0 - d, 0.0, 1.0), uFalloff) * uIntensity;
    gl_FragColor = vec4(uColor * a, a);
  }
`

/**
 * Radial-falloff billboard. A solid sphere with a basic material shades
 * uniformly and reads as a flat disc, so the glow is drawn in the shader.
 */
function Glow({
  radius,
  color,
  intensity,
  falloff,
  pulse = 0,
}: {
  radius: number
  color: string
  intensity: number
  falloff: number
  pulse?: number
}) {
  const mat = useRef<THREE.ShaderMaterial>(null)

  const uniforms = useMemo(
    () => ({
      uColor: { value: new THREE.Color(color) },
      uIntensity: { value: intensity },
      uFalloff: { value: falloff },
    }),
    [color, intensity, falloff],
  )

  useFrame((state) => {
    if (!mat.current || pulse === 0) return
    const t = state.clock.elapsedTime
    mat.current.uniforms.uIntensity.value = intensity * (1 + Math.sin(t * 0.5) * pulse)
  })

  return (
    <mesh scale={[radius, radius, 1]}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        ref={mat}
        vertexShader={glowVertexShader}
        fragmentShader={glowFragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  )
}

/**
 * The spiral sits at the origin, which the camera looks straight at — i.e.
 * directly behind the centred hero copy. Offsetting it keeps the type legible
 * and pulls it toward frame centre on narrow viewports where it would clip.
 */
function GalaxyPlacement({ children }: { children: React.ReactNode }) {
  const width = useThree((s) => s.size.width)
  const narrow = width < 768

  return (
    <group
      position={narrow ? [1, -8, -14] : [11, -12, -6]}
      scale={narrow ? 0.7 : 0.9}
    >
      {children}
    </group>
  )
}

function Scene({ dense = true }: { dense?: boolean }) {
  const prefersReduced = useMemo(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  }, [])

  return (
    <>
      <DeepField count={dense ? 4200 : 2200} />
      <GalaxyPlacement>
        {!prefersReduced && <SpiralArms count={dense ? 3600 : 1800} />}
        <Glow radius={9} color="#7c6aff" intensity={0.5} falloff={3.0} pulse={0.18} />
        <Glow radius={2.6} color="#f0e8ff" intensity={0.85} falloff={2.2} />
      </GalaxyPlacement>
      <fog attach="fog" args={['#050508', 50, 140]} />
    </>
  )
}

export function StarFieldCanvas({
  className = '',
  dense = true,
}: {
  className?: string
  dense?: boolean
  count?: number
  radius?: number
  depth?: number
  size?: number
  color?: string
  speed?: number
  interactive?: boolean
}) {
  return (
    <div className={`absolute inset-0 ${className}`} aria-hidden="true">
      <Canvas
        camera={{ position: [0, 4, 32], fov: 50, near: 0.1, far: 200 }}
        dpr={[1, 1.75]}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: 'high-performance',
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.15,
        }}
        style={{ background: 'transparent' }}
      >
        <color attach="background" args={['#050508']} />
        <Scene dense={dense} />
        <EffectComposer>
          <Bloom
            intensity={0.6}
            luminanceThreshold={0.55}
            luminanceSmoothing={0.3}
            mipmapBlur
            radius={0.6}
          />
        </EffectComposer>
      </Canvas>
    </div>
  )
}

export function StarFieldCSS({ className = '' }: { className?: string }) {
  const stars = useMemo(() => {
    return Array.from({ length: 100 }).map((_, i) => ({
      id: i,
      left: `${(i * 17 + 7) % 100}%`,
      top: `${(i * 23 + 11) % 100}%`,
      size: 1 + (i % 3),
      opacity: 0.2 + ((i * 13) % 50) / 100,
      delay: `${(i % 5) * 0.8}s`,
      duration: `${3 + (i % 4)}s`,
    }))
  }, [])

  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`} aria-hidden="true">
      {stars.map((s) => (
        <div
          key={s.id}
          className="absolute rounded-full bg-white animate-twinkle"
          style={{
            left: s.left,
            top: s.top,
            width: s.size,
            height: s.size,
            opacity: s.opacity,
            animationDelay: s.delay,
            animationDuration: s.duration,
          }}
        />
      ))}
    </div>
  )
}
