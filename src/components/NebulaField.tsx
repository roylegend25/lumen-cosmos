import { useRef, useMemo, useEffect, Suspense, type RefObject } from 'react'
import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import * as THREE from 'three'
import { assetUrl, bvToRGB } from '../lib/astro'

/* ------------------------------------------------------------------ *
 * Input plumbing. Scroll progress and pointer both live in refs so the
 * render loop can sample them without re-rendering React on every event.
 * ------------------------------------------------------------------ */

interface Input {
  /** 0 at the top of the document, 1 at the bottom. */
  progress: number
  /** Pointer in NDC (-1..1), and how strongly it should register. */
  px: number
  py: number
  active: number
}

function useJourneyInput() {
  const ref = useRef<Input>({ progress: 0, px: 0, py: 0, active: 0 })

  useEffect(() => {
    const onScroll = () => {
      const doc = document.documentElement
      const span = doc.scrollHeight - window.innerHeight
      ref.current.progress = span > 0 ? Math.min(1, Math.max(0, window.scrollY / span)) : 0
    }
    const onMove = (e: PointerEvent) => {
      ref.current.px = (e.clientX / window.innerWidth) * 2 - 1
      ref.current.py = -((e.clientY / window.innerHeight) * 2 - 1)
      ref.current.active = 1
    }
    const onLeave = () => {
      ref.current.active = 0
    }

    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    window.addEventListener('pointermove', onMove, { passive: true })
    window.addEventListener('pointerleave', onLeave)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerleave', onLeave)
    }
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
 * Nebula plate. Real NASA imagery keyed to its own luminance, with a
 * pointer-driven bloom and displacement so the cloud answers the cursor.
 * ------------------------------------------------------------------ */

const NEBULA_VERT = /* glsl */ `
  varying vec2 vUv;
  varying vec2 vNdc;
  void main() {
    vUv = uv;
    vec4 clip = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    // Normalised device coords let the fragment stage measure distance to the
    // pointer in screen space, which is what "near the cursor" means to a user.
    vNdc = clip.xy / clip.w;
    gl_Position = clip;
  }
`

const NEBULA_FRAG = /* glsl */ `
  uniform sampler2D uMap;
  uniform float uBrightness;
  uniform float uAlpha;
  uniform float uGamma;
  uniform float uFeather;
  uniform float uSaturation;
  uniform vec2  uPointer;
  uniform float uAspect;
  uniform float uReact;
  varying vec2 vUv;
  varying vec2 vNdc;

  void main() {
    // Gaussian falloff around the cursor. Aspect correction keeps the
    // influence circular rather than stretched on wide viewports.
    vec2 delta = (vNdc - uPointer) * vec2(uAspect, 1.0);
    float infl = exp(-dot(delta, delta) * 2.2) * uReact;

    // Push the cloud gently outward from the cursor, so it visibly parts.
    vec2 dir = normalize(vUv - 0.5 + 1e-5);
    vec2 uv = vUv + dir * infl * 0.045;

    vec4 t = texture2D(uMap, uv);

    // These plates sit on black sky, so luminance doubles as an alpha mask:
    // the cloud survives and the background drops out instead of showing a
    // rectangle. Gamma controls how hard the faint outskirts fade.
    float lum = dot(t.rgb, vec3(0.299, 0.587, 0.114));
    float mask = pow(clamp(lum, 0.0, 1.0), uGamma);

    // Feather the plate edges so nothing reads as a photograph border.
    float edge = smoothstep(0.5, uFeather, length(uv - 0.5));

    // Additive blending and ACES both pull toward grey; push the plate's own
    // colour back out before it reaches the composer.
    vec3 col = mix(vec3(lum), t.rgb, uSaturation);

    float a = mask * edge * uAlpha * (1.0 + infl * 0.9);
    gl_FragColor = vec4(col * uBrightness * (1.0 + infl * 1.6), a);
  }
`

interface PlateProps {
  slug: string
  x: number
  y: number
  z: number
  scale: number
  spin: number
  brightness?: number
  alpha?: number
  gamma?: number
  feather?: number
  saturation?: number
  react?: number
  input: RefObject<Input>
  reduced: boolean
}

function Plate({
  slug,
  x,
  y,
  z,
  scale,
  spin,
  brightness = 1.8,
  alpha = 0.9,
  gamma = 1.2,
  feather = 0.1,
  saturation = 1.5,
  react = 1,
  input,
  reduced,
}: PlateProps) {
  const map = useLoader(THREE.TextureLoader, assetUrl(`nebulae/${slug}.webp`))
  const mesh = useRef<THREE.Mesh>(null)
  const { size } = useThree()

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
      uPointer: { value: new THREE.Vector2(0, 0) },
      uAspect: { value: 1 },
      uReact: { value: 0 },
    }),
    [map, brightness, alpha, gamma, feather, saturation],
  )

  const smoothed = useRef({ x: 0, y: 0, a: 0 })

  useFrame((state, delta) => {
    if (!mesh.current) return
    const t = state.clock.elapsedTime
    const I = input.current

    // Ease the pointer so the cloud glides instead of snapping.
    const k = 1 - Math.pow(0.002, delta)
    smoothed.current.x += (I.px - smoothed.current.x) * k
    smoothed.current.y += (I.py - smoothed.current.y) * k
    smoothed.current.a += ((reduced ? 0 : I.active) - smoothed.current.a) * k

    uniforms.uPointer.value.set(smoothed.current.x, smoothed.current.y)
    uniforms.uAspect.value = size.width / Math.max(1, size.height)
    uniforms.uReact.value = smoothed.current.a * react

    mesh.current.rotation.z = reduced ? 0 : t * spin
  })

  return (
    <mesh ref={mesh} position={[x, y, z]} scale={[scale, scale, 1]}>
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
 * Star corridor — fills the space between plates so the flight reads.
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
    gl_PointSize = aScale * uPixelRatio * (320.0 / max(-mv.z, 0.001));
  }
`

const STAR_FRAG = /* glsl */ `
  varying vec3 vColor;
  varying float vTw;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    if (d > 0.5) discard;
    float g = pow(smoothstep(0.5, 0.0, d), 4.0);
    gl_FragColor = vec4(vColor * g, g * vTw);
  }
`

function StarCorridor({ count, depth, reduced }: { count: number; depth: number; reduced: boolean }) {
  const mat = useRef<THREE.ShaderMaterial>(null)

  const { positions, colors, scales, phases } = useMemo(() => {
    const positions = new Float32Array(count * 3)
    const colors = new Float32Array(count * 3)
    const scales = new Float32Array(count)
    const phases = new Float32Array(count)
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 260
      positions[i * 3 + 1] = (Math.random() - 0.5) * 190
      positions[i * 3 + 2] = 20 - Math.random() * (depth + 120)

      const [r, g, b] = bvToRGB(-0.32 + Math.random() * 1.9)
      colors[i * 3] = r
      colors[i * 3 + 1] = g
      colors[i * 3 + 2] = b

      scales[i] = Math.random() < 0.04 ? 2.4 + Math.random() * 2.2 : 0.5 + Math.random() * 1.2
      phases[i] = Math.random()
    }
    return { positions, colors, scales, phases }
  }, [count, depth])

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
    if (mat.current && !reduced) mat.current.uniforms.uTime.value = state.clock.elapsedTime
  })

  return (
    <points frustumCulled={false}>
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
 * The flight itself
 * ------------------------------------------------------------------ */

const TRAVEL = 620

/**
 * Plates are spread down the corridor so each becomes the subject at a
 * different point in the page, with lateral offsets so the flight is not a
 * straight tunnel. Scroll maps to camera Z; the page never runs out of sky.
 */
const PLATES: Array<Omit<PlateProps, 'input' | 'reduced'>> = [
  { slug: 'orion',     x:   0, y:   0, z:  -30, scale: 74, spin:  0.007, brightness: 2.6, alpha: 1.0, gamma: 0.95, saturation: 1.6, feather: 0.05, react: 1.0 },
  { slug: 'carina',    x: -46, y:  20, z: -108, scale: 76, spin: -0.005, brightness: 2.0, alpha: 0.8, gamma: 1.2,  react: 0.9 },
  { slug: 'eagle',     x:  44, y: -18, z: -186, scale: 74, spin:  0.006, brightness: 2.0, alpha: 0.8, gamma: 1.15, react: 0.9 },
  { slug: 'horsehead', x: -34, y: -26, z: -258, scale: 62, spin: -0.008, brightness: 1.9, alpha: 0.78, gamma: 1.25, react: 1.0 },
  { slug: 'lagoon',    x:  40, y:  26, z: -330, scale: 78, spin:  0.004, brightness: 1.9, alpha: 0.75, gamma: 1.3,  react: 0.9 },
  { slug: 'andromeda', x: -20, y:   8, z: -410, scale: 88, spin:  0.003, brightness: 2.1, alpha: 0.85, gamma: 1.05, react: 1.0 },
  { slug: 'helix',     x:  38, y: -22, z: -486, scale: 46, spin: -0.011, brightness: 2.2, alpha: 0.85, gamma: 1.1,  react: 1.2 },
  { slug: 'crab',      x: -30, y:  22, z: -556, scale: 56, spin:  0.009, brightness: 2.1, alpha: 0.82, gamma: 1.1,  react: 1.1 },
  { slug: 'veil',      x:  16, y:  -8, z: -624, scale: 82, spin: -0.004, brightness: 2.0, alpha: 0.7,  gamma: 1.3,  react: 0.9 },
]

function Flight({ input, reduced }: { input: RefObject<Input>; reduced: boolean }) {
  const eased = useRef(0)

  useFrame((state, delta) => {
    const I = input.current
    // Ease scroll so the flight keeps gliding after the wheel stops.
    const k = 1 - Math.pow(0.0008, delta)
    eased.current += (I.progress - eased.current) * k

    const cam = state.camera
    cam.position.z = 24 - eased.current * TRAVEL
    // Drift laterally toward the pointer; the corridor should feel steerable.
    const tx = reduced ? 0 : I.px * 7 * I.active
    const ty = reduced ? 0 : I.py * 4.5 * I.active
    cam.position.x += (tx - cam.position.x) * (1 - Math.pow(0.004, delta))
    cam.position.y += (ty - cam.position.y) * (1 - Math.pow(0.004, delta))
    cam.lookAt(0, 0, cam.position.z - 60)
  })

  return null
}

function Scene({ input, reduced }: { input: RefObject<Input>; reduced: boolean }) {
  const narrow = useThree((s) => s.size.width) < 768
  const k = narrow ? 0.6 : 1

  return (
    <>
      <StarCorridor count={narrow ? 1100 : 2200} depth={TRAVEL} reduced={reduced} />
      {PLATES.map((p) => (
        <Plate
          key={p.slug}
          {...p}
          x={p.x * k}
          y={p.y * k}
          scale={p.scale * k}
          input={input}
          reduced={reduced}
        />
      ))}
      <Flight input={input} reduced={reduced} />
    </>
  )
}

/**
 * Full-page background. Rendered once behind the whole document rather than
 * inside the hero, so scrolling flies through the field instead of leaving
 * empty space below the fold.
 */
export function NebulaJourney({ className = '' }: { className?: string }) {
  const input = useJourneyInput()
  const reduced = usePrefersReducedMotion()

  return (
    <div className={`fixed inset-0 z-0 pointer-events-none ${className}`} aria-hidden="true">
      <Canvas
        camera={{ position: [0, 0, 24], fov: 62, near: 0.1, far: 1200 }}
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
          <Scene input={input} reduced={reduced} />
        </Suspense>
        <EffectComposer>
          <Bloom intensity={0.9} luminanceThreshold={0.42} luminanceSmoothing={0.35} mipmapBlur radius={0.72} />
        </EffectComposer>
      </Canvas>

      {/* Page-level edge falloff. Fixed alongside the canvas so it never
          terminates mid-document the way a section-scoped vignette does. */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 95% 85% at 50% 45%, transparent 0%, rgba(5,5,8,0.05) 62%, rgba(5,5,8,0.5) 100%)',
        }}
      />
    </div>
  )
}
