import { useRef, useMemo, useEffect, Suspense, type RefObject } from 'react'
import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import * as THREE from 'three'
import { assetUrl, bvToRGB } from '../lib/astro'

/* ------------------------------------------------------------------ *
 * Scroll plumbing. Kept in a ref so scrolling never triggers a React
 * re-render — the render loop samples it directly each frame.
 * ------------------------------------------------------------------ */

export function useScrollRef() {
  const ref = useRef(0)
  useEffect(() => {
    const onScroll = () => {
      ref.current = window.scrollY
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  return ref
}

function usePrefersReducedMotion() {
  return useMemo(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  }, [])
}

/* ------------------------------------------------------------------ *
 * Nebula layer — a real NASA plate keyed to its own luminance.
 * ------------------------------------------------------------------ */

const NEBULA_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const NEBULA_FRAG = /* glsl */ `
  uniform sampler2D uMap;
  uniform float uBrightness;
  uniform float uAlpha;
  uniform float uGamma;
  uniform float uFeather;
  uniform float uSaturation;
  varying vec2 vUv;

  void main() {
    vec4 t = texture2D(uMap, vUv);

    // These plates sit on black sky, so luminance doubles as an alpha mask:
    // the cloud stays and the background drops out instead of showing a
    // rectangle. Gamma controls how aggressively the faint outskirts fade.
    float lum = dot(t.rgb, vec3(0.299, 0.587, 0.114));
    float mask = pow(clamp(lum, 0.0, 1.0), uGamma);

    // Feather the plate edges so nothing reads as a photograph border.
    float edge = smoothstep(0.5, uFeather, length(vUv - 0.5));

    // Additive blending plus ACES tone mapping both pull toward grey, so the
    // plate's own colour is pushed back out before it reaches the composer.
    vec3 col = mix(vec3(lum), t.rgb, uSaturation);

    float a = mask * edge * uAlpha;
    gl_FragColor = vec4(col * uBrightness, a);
  }
`

interface LayerProps {
  slug: string
  position: [number, number, number]
  scale: number
  spin: number
  brightness?: number
  alpha?: number
  gamma?: number
  feather?: number
  saturation?: number
  parallax?: number
  drift?: number
  scrollRef: RefObject<number>
  reduced: boolean
}

function NebulaLayer({
  slug,
  position,
  scale,
  spin,
  brightness = 1.0,
  alpha = 1.0,
  gamma = 1.3,
  feather = 0.16,
  saturation = 1.45,
  parallax = 0,
  drift = 0,
  scrollRef,
  reduced,
}: LayerProps) {
  const map = useLoader(THREE.TextureLoader, assetUrl(`nebulae/${slug}.jpg`))
  const mesh = useRef<THREE.Mesh>(null)

  useMemo(() => {
    map.colorSpace = THREE.SRGBColorSpace
    map.minFilter = THREE.LinearMipmapLinearFilter
    map.generateMipmaps = true
  }, [map])

  const uniforms = useMemo(
    () => ({
      uMap: { value: map },
      uBrightness: { value: brightness },
      uAlpha: { value: alpha },
      uGamma: { value: gamma },
      uFeather: { value: feather },
      uSaturation: { value: saturation },
    }),
    [map, brightness, alpha, gamma, feather, saturation],
  )

  useFrame((state) => {
    if (!mesh.current) return
    const t = state.clock.elapsedTime
    const s = scrollRef.current || 0
    const vh = typeof window !== 'undefined' ? window.innerHeight : 1
    const p = s / vh // pages scrolled

    // Continuous drift plus a scroll-coupled term: the field keeps turning
    // on its own, and scrolling adds to that rotation rather than replacing it.
    mesh.current.rotation.z = (reduced ? 0 : t * spin) + p * drift

    mesh.current.position.y = position[1] + p * parallax
  })

  return (
    <mesh ref={mesh} position={position} scale={[scale, scale, 1]}>
      <planeGeometry args={[1, 1]} />
      <shaderMaterial
        vertexShader={NEBULA_VERT}
        fragmentShader={NEBULA_FRAG}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        depthTest={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  )
}

/* ------------------------------------------------------------------ *
 * Foreground stars — real B-V colours, drawn from the catalogue tail.
 * ------------------------------------------------------------------ */

const STAR_VERT = /* glsl */ `
  uniform float uTime;
  uniform float uPixelRatio;
  attribute float aScale;
  attribute float aPhase;
  attribute vec3 aColor;
  varying vec3 vColor;
  varying float vTw;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    vTw = 0.6 + 0.4 * sin(uTime * 0.9 + aPhase * 6.2831853);
    vColor = aColor;
    gl_PointSize = aScale * uPixelRatio * (300.0 / max(-mv.z, 0.001));
  }
`

const STAR_FRAG = /* glsl */ `
  varying vec3 vColor;
  varying float vTw;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    if (d > 0.5) discard;
    float core = smoothstep(0.5, 0.0, d);
    float g = pow(core, 4.0);
    gl_FragColor = vec4(vColor * g, g * vTw);
  }
`

function DriftStars({
  count,
  scrollRef,
  reduced,
}: {
  count: number
  scrollRef: RefObject<number>
  reduced: boolean
}) {
  const ref = useRef<THREE.Points>(null)
  const mat = useRef<THREE.ShaderMaterial>(null)

  const { positions, colors, scales, phases } = useMemo(() => {
    const positions = new Float32Array(count * 3)
    const colors = new Float32Array(count * 3)
    const scales = new Float32Array(count)
    const phases = new Float32Array(count)

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 190
      positions[i * 3 + 1] = (Math.random() - 0.5) * 130
      positions[i * 3 + 2] = -20 - Math.random() * 90

      // Spread across a realistic B-V range rather than inventing hues.
      const bv = -0.32 + Math.random() * 1.9
      const [r, g, b] = bvToRGB(bv)
      colors[i * 3] = r
      colors[i * 3 + 1] = g
      colors[i * 3 + 2] = b

      scales[i] = Math.random() < 0.03 ? 2.2 + Math.random() * 2.0 : 0.5 + Math.random() * 1.1
      phases[i] = Math.random()
    }
    return { positions, colors, scales, phases }
  }, [count])

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uPixelRatio: {
        value: Math.min(typeof window !== 'undefined' ? window.devicePixelRatio : 1, 2),
      },
    }),
    [],
  )

  useFrame((state) => {
    const t = state.clock.elapsedTime
    if (mat.current && !reduced) mat.current.uniforms.uTime.value = t
    if (!ref.current) return
    const p = (scrollRef.current || 0) / (typeof window !== 'undefined' ? window.innerHeight : 1)
    ref.current.position.y = p * 16
    ref.current.rotation.z = (reduced ? 0 : t * 0.004) + p * 0.06
  })

  return (
    <points ref={ref} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-aColor" args={[colors, 3]} />
        <bufferAttribute attach="attributes-aScale" args={[scales, 1]} />
        <bufferAttribute attach="attributes-aPhase" args={[phases, 1]} />
      </bufferGeometry>
      <shaderMaterial
        ref={mat}
        vertexShader={STAR_VERT}
        fragmentShader={STAR_FRAG}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  )
}

/* ------------------------------------------------------------------ *
 * Composition
 * ------------------------------------------------------------------ */

function Rig({ scrollRef, enabled }: { scrollRef: RefObject<number>; enabled: boolean }) {
  useFrame((state, delta) => {
    const p = (scrollRef.current || 0) / (typeof window !== 'undefined' ? window.innerHeight : 1)
    const damp = 1 - Math.pow(0.0015, delta)
    const targetX = enabled ? state.pointer.x * 2.2 : 0
    const targetY = (enabled ? state.pointer.y * 1.4 : 0) + p * 3.5

    state.camera.position.x += (targetX - state.camera.position.x) * damp
    state.camera.position.y += (targetY - state.camera.position.y) * damp
    // Scrolling pushes the viewer gently into the field.
    state.camera.position.z += (46 - p * 9 - state.camera.position.z) * damp
    state.camera.lookAt(0, 0, 0)
  })
  return null
}

function Scene({ scrollRef, reduced }: { scrollRef: RefObject<number>; reduced: boolean }) {
  const narrow = useThree((s) => s.size.width) < 768
  const k = narrow ? 0.62 : 1

  return (
    <>
      <DriftStars count={narrow ? 900 : 1700} scrollRef={scrollRef} reduced={reduced} />

      {/* Centrepiece. Orion is the brightest, most detailed plate we have. */}
      <NebulaLayer
        slug="orion"
        position={[0, 0, -18]}
        scale={62 * k}
        spin={0.0075}
        drift={0.5}
        parallax={-7}
        brightness={2.6}
        alpha={1.0}
        gamma={0.95}
        saturation={1.6}
        feather={0.06}
        scrollRef={scrollRef}
        reduced={reduced}
      />

      {/* Flanking clouds give the centrepiece depth and keep it off-symmetric. */}
      <NebulaLayer
        slug="carina"
        position={[-38 * k, 12, -52]}
        scale={58 * k}
        spin={-0.005}
        drift={-0.75}
        parallax={-13}
        brightness={1.7}
        alpha={0.75}
        gamma={1.35}
        scrollRef={scrollRef}
        reduced={reduced}
      />
      <NebulaLayer
        slug="lagoon"
        position={[40 * k, -14, -60]}
        scale={62 * k}
        spin={0.004}
        drift={0.9}
        parallax={-16}
        brightness={1.6}
        alpha={0.7}
        gamma={1.45}
        scrollRef={scrollRef}
        reduced={reduced}
      />
      <NebulaLayer
        slug="helix"
        position={[26 * k, 22, -34]}
        scale={26 * k}
        spin={-0.011}
        drift={1.5}
        parallax={-4}
        brightness={2.1}
        alpha={0.85}
        gamma={1.2}
        scrollRef={scrollRef}
        reduced={reduced}
      />
      <NebulaLayer
        slug="horsehead"
        position={[-30 * k, -22, -28]}
        scale={30 * k}
        spin={0.009}
        drift={-1.2}
        parallax={-5}
        brightness={1.9}
        alpha={0.8}
        gamma={1.3}
        scrollRef={scrollRef}
        reduced={reduced}
      />

      <Rig scrollRef={scrollRef} enabled={!reduced} />
    </>
  )
}

export function NebulaField({ className = '' }: { className?: string }) {
  const scrollRef = useScrollRef()
  const reduced = usePrefersReducedMotion()

  return (
    <div className={`absolute inset-0 ${className}`} aria-hidden="true">
      <Canvas
        camera={{ position: [0, 0, 46], fov: 58, near: 0.1, far: 400 }}
        dpr={[1, 1.75]}
        gl={{
          antialias: false,
          alpha: true,
          powerPreference: 'high-performance',
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.25,
        }}
        style={{ background: 'transparent' }}
      >
        <Suspense fallback={null}>
          <Scene scrollRef={scrollRef} reduced={reduced} />
        </Suspense>
        <EffectComposer>
          <Bloom intensity={0.85} luminanceThreshold={0.45} luminanceSmoothing={0.35} mipmapBlur radius={0.7} />
        </EffectComposer>
      </Canvas>
    </div>
  )
}
