import { useRef, useMemo, useEffect, useState, memo, type RefObject } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { assetUrl, bvToRGB } from '../lib/astro'
import { STAR_SPRITE_FRAG, STAR_SPRITE_VERT, starSpriteUniforms } from '../lib/starShader'

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
  uniform float uGlow;
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

    // Sampling a deliberately coarse mip gives a blurred copy for free —
    // the chain is already built. Adding it back is a bloom in one fetch,
    // where an EffectComposer pass measured 83ms per frame.
    vec3 glow = texture2D(uMap, uv, 4.5).rgb;

    // These plates sit on black sky, so luminance doubles as an alpha mask:
    // the cloud survives and the background drops out instead of showing a
    // rectangle. Gamma controls how hard the faint outskirts fade.
    float lum = dot(t.rgb, vec3(0.299, 0.587, 0.114));

    // The mask must account for the blurred copy as well as the sharp one.
    // Keying alpha off the sharp image alone meant a dark pixel beside a
    // bright region was masked to zero, so the glow was multiplied away and
    // no halo ever appeared — the one thing bloom actually does.
    float glum = dot(glow, vec3(0.299, 0.587, 0.114));
    float mask = pow(clamp(max(lum, glum * uGlow), 0.0, 1.0), uGamma);

    // Feather the plate edges so nothing reads as a photograph border.
    float edge = smoothstep(0.5, uFeather, length(uv - 0.5));

    // Additive blending and ACES both pull toward grey; push the plate's own
    // colour back out before it reaches the composer.
    // Soft-knee the halo so bright cores spread instead of clipping to a
    // flat white disc.
    vec3 haze = glow * uGlow;
    haze = haze / (1.0 + haze * 0.85);
    vec3 col = mix(vec3(lum), t.rgb, uSaturation) + haze;

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
  glow?: number
  react?: number
  input: RefObject<Input>
  reduced: boolean
}

/**
 * Serialises plate loading across the whole scene.
 *
 * Profiling the scroll showed the cost was not download or React work — it
 * was texSubImage2D, the synchronous upload of each plate to the GPU. Two
 * plates arriving together meant two multi-megabyte uploads in one frame and
 * a visible stall, so uploads are queued one at a time with a frame between
 * them for the compositor to breathe.
 */
let uploadChain: Promise<void> = Promise.resolve()

function nextFrame() {
  return new Promise<void>((r) => requestAnimationFrame(() => r()))
}

/**
 * Loads a plate once the flight is near it, decoding off the main thread.
 *
 * createImageBitmap does the decode on a worker thread; TextureLoader's
 * HTMLImageElement path decodes on the main thread and blocks. A failed
 * texture yields null rather than throwing through the tree.
 */
function useLazyTexture(url: string, enabled: boolean, maxAniso: number) {
  const [map, setMap] = useState<THREE.Texture | null>(null)

  useEffect(() => {
    if (!enabled || map) return
    let cancelled = false

    uploadChain = uploadChain.then(async () => {
      if (cancelled) return
      try {
        const res = await fetch(url)
        if (!res.ok || cancelled) return
        const blob = await res.blob()
        const bitmap = await createImageBitmap(blob)
        if (cancelled) {
          bitmap.close()
          return
        }

        const t = new THREE.Texture(bitmap as unknown as HTMLImageElement)
        t.colorSpace = THREE.SRGBColorSpace
        t.generateMipmaps = true
        t.minFilter = THREE.LinearMipmapLinearFilter
        t.magFilter = THREE.LinearFilter
        // Plates are viewed at an angle for most of the flight; without
        // anisotropy they smear.
        t.anisotropy = maxAniso
        t.needsUpdate = true
        setMap(t)

        // Let the upload and mipmap build land before starting the next.
        await nextFrame()
        await nextFrame()
      } catch {
        /* a missing or undecodable plate simply never appears */
      }
    })

    return () => {
      cancelled = true
    }
  }, [url, enabled, map, maxAniso])

  return map
}

const Plate = memo(function Plate({
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
  glow = 0.9,
  react = 1,
  active,
  input,
  reduced,
}: PlateProps & { active: boolean }) {
  const mesh = useRef<THREE.Mesh>(null)
  const { size, gl } = useThree()
  const maxAniso = useMemo(() => gl.capabilities.getMaxAnisotropy(), [gl])
  const map = useLazyTexture(assetUrl(`nebulae/hd/${slug}.webp`), active, maxAniso)

  const uniforms = useMemo(
    () => ({
      uMap: { value: map },
      uBrightness: { value: brightness },
      uAlpha: { value: alpha },
      uGamma: { value: gamma },
      uFeather: { value: feather },
      uSaturation: { value: saturation },
      uGlow: { value: glow },
      uPointer: { value: new THREE.Vector2(0, 0) },
      uAspect: { value: 1 },
      uReact: { value: 0 },
    }),
    [map, brightness, alpha, gamma, feather, saturation, glow],
  )

  const smoothed = useRef({ x: 0, y: 0, a: 0 })
  const fade = useRef(0)

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

    // Fade in once decoded, so a late-arriving plate does not pop.
    fade.current += ((map ? 1 : 0) - fade.current) * (1 - Math.pow(0.02, delta))
    uniforms.uAlpha.value = alpha * fade.current

    // Cull anything well behind or far ahead of the camera. These planes are
    // full-screen and additive, so drawing an off-screen one is pure cost.
    const dz = state.camera.position.z - z
    mesh.current.visible = dz > -40 && dz < 260

    mesh.current.rotation.z = reduced ? 0 : t * spin
  })

  if (!map) return null

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
})

/* ------------------------------------------------------------------ *
 * Star corridor — fills the space between plates so the flight reads.
 * ------------------------------------------------------------------ */


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
    () => starSpriteUniforms({ scale: 1.15, spikes: 0.6, halo: 0.4, twinkle: 0.3 }),
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
        vertexShader={STAR_SPRITE_VERT}
        fragmentShader={STAR_SPRITE_FRAG}
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
 *
 * Horsehead opens: it sits on dark sky with real structure, so the page
 * begins with an object in space. Orion's core is almost pure white and
 * blew out the first screen, so it now arrives deeper in, dimmer, as a
 * payoff rather than a greeting. Veil was dropped — its only NASA master
 * is 960px and could never look sharp at this size.
 */
const PLATES: Array<Omit<PlateProps, 'input' | 'reduced'>> = [
  { slug: 'horsehead', x:  -4, y:   1, z:  -40, scale: 72, spin:  0.006, brightness: 4.6, alpha: 1.0, gamma: 0.9, saturation: 1.5, feather: 0.07, react: 1.0 },
  { slug: 'carina',    x: -44, y:  16, z: -122, scale: 78, spin: -0.005, brightness: 4.0, alpha: 0.9, gamma: 1.05,  react: 0.9 },
  { slug: 'lagoon',    x:  42, y: -16, z: -198, scale: 76, spin:  0.004, brightness: 4.0, alpha: 0.88, gamma: 1.1, react: 0.9 },
  { slug: 'eagle',     x: -30, y: -22, z: -272, scale: 70, spin:  0.006, brightness: 4.1, alpha: 0.86, gamma: 1.05,  react: 0.95 },
  { slug: 'andromeda', x:  24, y:  20, z: -348, scale: 86, spin:  0.003, brightness: 3.6, alpha: 0.9, gamma: 0.95, react: 1.0 },
  { slug: 'helix',     x: -34, y: -14, z: -420, scale: 44, spin: -0.010, brightness: 3.6, alpha: 0.9, gamma: 1.0, react: 1.2 },
  { slug: 'orion',     x:  20, y:  10, z: -494, scale: 72, spin:  0.005, brightness: 3.8, alpha: 0.86, gamma: 1.25,  saturation: 1.55, react: 1.0 },
  { slug: 'crab',      x: -26, y:  20, z: -566, scale: 52, spin:  0.008, brightness: 3.5, alpha: 0.84, gamma: 1.15,  react: 1.1 },
  { slug: 'flame',     x:  22, y: -10, z: -636, scale: 68, spin: -0.004, brightness: 2.9, alpha: 0.78, gamma: 1.4, react: 0.9 },
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

  // Coarse scroll progress, only for deciding which plates to fetch. Polled
  // rather than driven from useFrame so it changes state a few times per
  // page rather than sixty times per second.
  const [progress, setProgress] = useState(0)
  useEffect(() => {
    const id = setInterval(() => {
      const p = input.current?.progress ?? 0
      setProgress((prev) => (Math.abs(p - prev) > 0.02 ? p : prev))
    }, 250)
    return () => clearInterval(id)
  }, [input])

  return (
    <>
      <StarCorridor count={narrow ? 700 : 1700} depth={TRAVEL} reduced={reduced} />
      {PLATES.map((p) => {
        // Where in the scroll this plate sits, with a lead so it is decoded
        // before it comes into view.
        const at = (24 - p.z) / TRAVEL
        return (
          <Plate
            key={p.slug}
            {...p}
            x={p.x * k}
            y={p.y * k}
            scale={p.scale * k}
            active={progress > at - 0.3}
            input={input}
            reduced={reduced}
          />
        )
      })}
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
        dpr={[1, 1.4]}
        gl={{
          antialias: false,
          alpha: true,
          powerPreference: 'high-performance',
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.25,
        }}
        style={{ background: 'transparent' }}
      >
        <Scene input={input} reduced={reduced} />
      </Canvas>

      {/* Page-level edge falloff. Fixed alongside the canvas so it never
          terminates mid-document the way a section-scoped vignette does. */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 100% 90% at 50% 45%, transparent 0%, rgba(5,5,8,0.03) 68%, rgba(5,5,8,0.42) 100%)',
        }}
      />
    </div>
  )
}
