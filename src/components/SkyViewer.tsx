import { useRef, useMemo, useEffect, useState, useCallback } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import * as THREE from 'three'
import {
  bvToRGB,
  loadConstellations,
  loadSky,
  magToBrightness,
  radecToVec3,
  type Constellation,
  type SkyData,
} from '../lib/astro'

const SKY_R = 100

/* ------------------------------------------------------------------ *
 * Look controls. The camera sits at the origin and only ever changes
 * orientation, which is what standing under the sky actually does —
 * orbiting a target would move us off the celestial sphere.
 * ------------------------------------------------------------------ */

interface LookState {
  theta: number
  phi: number
  fov: number
  targetTheta: number
  targetPhi: number
  targetFov: number
  dragging: boolean
}

function LookRig({ look }: { look: React.MutableRefObject<LookState> }) {
  const { camera, gl } = useThree()

  useEffect(() => {
    const el = gl.domElement
    let lastX = 0
    let lastY = 0
    let moved = 0

    const down = (e: PointerEvent) => {
      look.current.dragging = true
      moved = 0
      lastX = e.clientX
      lastY = e.clientY
      el.setPointerCapture(e.pointerId)
    }
    const move = (e: PointerEvent) => {
      if (!look.current.dragging) return
      const dx = e.clientX - lastX
      const dy = e.clientY - lastY
      lastX = e.clientX
      lastY = e.clientY
      moved += Math.abs(dx) + Math.abs(dy)

      // Scale with FOV so zoomed-in dragging stays proportional on screen.
      const k = (look.current.fov / 60) * 0.004
      look.current.targetTheta -= dx * k
      look.current.targetPhi = THREE.MathUtils.clamp(
        look.current.targetPhi - dy * k,
        0.06,
        Math.PI - 0.06,
      )
    }
    const up = (e: PointerEvent) => {
      look.current.dragging = false
      try {
        el.releasePointerCapture(e.pointerId)
      } catch {
        /* pointer already released */
      }
      el.dataset.dragged = moved > 6 ? '1' : '0'
    }
    const wheel = (e: WheelEvent) => {
      e.preventDefault()
      look.current.targetFov = THREE.MathUtils.clamp(
        look.current.targetFov + e.deltaY * 0.05,
        14,
        78,
      )
    }

    el.addEventListener('pointerdown', down)
    el.addEventListener('pointermove', move)
    el.addEventListener('pointerup', up)
    el.addEventListener('pointercancel', up)
    el.addEventListener('wheel', wheel, { passive: false })
    return () => {
      el.removeEventListener('pointerdown', down)
      el.removeEventListener('pointermove', move)
      el.removeEventListener('pointerup', up)
      el.removeEventListener('pointercancel', up)
      el.removeEventListener('wheel', wheel)
    }
  }, [gl, look])

  useFrame((_, delta) => {
    const L = look.current
    const damp = 1 - Math.pow(0.0001, delta)
    L.theta += (L.targetTheta - L.theta) * damp
    L.phi += (L.targetPhi - L.phi) * damp
    L.fov += (L.targetFov - L.fov) * damp

    const cam = camera as THREE.PerspectiveCamera
    if (Math.abs(cam.fov - L.fov) > 0.01) {
      cam.fov = L.fov
      cam.updateProjectionMatrix()
    }
    const dir = new THREE.Vector3().setFromSphericalCoords(1, L.phi, L.theta)
    cam.lookAt(dir)
  })

  return null
}

/* ------------------------------------------------------------------ *
 * Stars — one draw call for the whole naked-eye sky.
 * ------------------------------------------------------------------ */

const SKY_VERT = /* glsl */ `
  uniform float uTime;
  uniform float uPixelRatio;
  uniform float uFovScale;
  attribute float aSize;
  attribute float aPhase;
  attribute vec3 aColor;
  varying vec3 vColor;
  varying float vTw;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    // Atmospheric shimmer, strongest on the faintest stars.
    vTw = 0.78 + 0.22 * sin(uTime * 1.6 + aPhase * 6.2831853);
    vColor = aColor;
    gl_PointSize = aSize * uPixelRatio * uFovScale;
  }
`

const SKY_FRAG = /* glsl */ `
  varying vec3 vColor;
  varying float vTw;
  void main() {
    vec2 p = gl_PointCoord - 0.5;
    float d = length(p);
    if (d > 0.5) discard;
    float core = smoothstep(0.5, 0.0, d);
    float g = pow(core, 3.0);
    gl_FragColor = vec4(vColor * (0.35 + g), g * vTw);
  }
`

function Stars({ sky, reduced }: { sky: SkyData; reduced: boolean }) {
  const mat = useRef<THREE.ShaderMaterial>(null)
  const { camera } = useThree()

  const { positions, colors, sizes, phases } = useMemo(() => {
    const n = sky.stars.length
    const positions = new Float32Array(n * 3)
    const colors = new Float32Array(n * 3)
    const sizes = new Float32Array(n)
    const phases = new Float32Array(n)

    for (let i = 0; i < n; i++) {
      const [ra, dec, mag, ci] = sky.stars[i]
      const v = radecToVec3(ra, dec, SKY_R)
      positions[i * 3] = v.x
      positions[i * 3 + 1] = v.y
      positions[i * 3 + 2] = v.z

      const [r, g, b] = bvToRGB(ci)
      colors[i * 3] = r
      colors[i * 3 + 1] = g
      colors[i * 3 + 2] = b

      const bright = magToBrightness(mag, sky.magLimit)
      sizes[i] = 1.6 + bright * 9.5
      phases[i] = Math.random()
    }
    return { positions, colors, sizes, phases }
  }, [sky])

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uPixelRatio: {
        value: Math.min(typeof window !== 'undefined' ? window.devicePixelRatio : 1, 2),
      },
      uFovScale: { value: 1 },
    }),
    [],
  )

  useFrame((state) => {
    if (!mat.current) return
    if (!reduced) mat.current.uniforms.uTime.value = state.clock.elapsedTime
    // Zooming in must enlarge stars, or the sky looks emptier the closer you look.
    const cam = camera as THREE.PerspectiveCamera
    mat.current.uniforms.uFovScale.value = 60 / cam.fov
  })

  return (
    <points frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-aColor" args={[colors, 3]} />
        <bufferAttribute attach="attributes-aSize" args={[sizes, 1]} />
        <bufferAttribute attach="attributes-aPhase" args={[phases, 1]} />
      </bufferGeometry>
      <shaderMaterial
        ref={mat}
        vertexShader={SKY_VERT}
        fragmentShader={SKY_FRAG}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  )
}

/* ------------------------------------------------------------------ *
 * Constellation figures
 * ------------------------------------------------------------------ */

function ConstellationLines({
  constellations,
  activeId,
}: {
  constellations: Constellation[]
  activeId: string | null
}) {
  const base = useMemo(() => {
    const pts: number[] = []
    for (const c of constellations) {
      if (c.id === activeId) continue
      for (const seg of c.segments) {
        for (let i = 0; i < seg.length - 1; i++) {
          const a = radecToVec3(seg[i][0], seg[i][1], SKY_R * 0.985)
          const b = radecToVec3(seg[i + 1][0], seg[i + 1][1], SKY_R * 0.985)
          pts.push(a.x, a.y, a.z, b.x, b.y, b.z)
        }
      }
    }
    return new Float32Array(pts)
  }, [constellations, activeId])

  const active = useMemo(() => {
    const c = constellations.find((x) => x.id === activeId)
    if (!c) return new Float32Array(0)
    const pts: number[] = []
    for (const seg of c.segments) {
      for (let i = 0; i < seg.length - 1; i++) {
        const a = radecToVec3(seg[i][0], seg[i][1], SKY_R * 0.98)
        const b = radecToVec3(seg[i + 1][0], seg[i + 1][1], SKY_R * 0.98)
        pts.push(a.x, a.y, a.z, b.x, b.y, b.z)
      }
    }
    return new Float32Array(pts)
  }, [constellations, activeId])

  return (
    <>
      {base.length > 0 && (
        <lineSegments frustumCulled={false}>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" args={[base, 3]} />
          </bufferGeometry>
          <lineBasicMaterial color="#5b6cff" transparent opacity={0.24} depthWrite={false} />
        </lineSegments>
      )}
      {active.length > 0 && (
        <lineSegments frustumCulled={false}>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" args={[active, 3]} />
          </bufferGeometry>
          <lineBasicMaterial color="#9b8cff" transparent opacity={0.95} depthWrite={false} />
        </lineSegments>
      )}
    </>
  )
}

/* ------------------------------------------------------------------ *
 * Picking — compare the view ray against each figure's centroid.
 * Raycasting thin lines is unreliable; nearest-centroid is predictable.
 * ------------------------------------------------------------------ */

function useCentroids(constellations: Constellation[]) {
  return useMemo(() => {
    return constellations.map((c) => {
      const v = new THREE.Vector3()
      let n = 0
      for (const seg of c.segments) {
        for (const [ra, dec] of seg) {
          v.add(radecToVec3(ra, dec, 1))
          n++
        }
      }
      if (!n && c.stars.length) {
        for (const s of c.stars) {
          v.add(radecToVec3(s.ra, s.dec, 1))
          n++
        }
      }
      if (n) v.divideScalar(n).normalize()
      return { id: c.id, dir: v }
    })
  }, [constellations])
}

function Picker({
  constellations,
  onPick,
}: {
  constellations: Constellation[]
  onPick: (id: string | null) => void
}) {
  const { gl, camera } = useThree()
  const centroids = useCentroids(constellations)

  useEffect(() => {
    const el = gl.domElement
    const click = (e: MouseEvent) => {
      if (el.dataset.dragged === '1') return // a drag, not a tap
      const rect = el.getBoundingClientRect()
      const ndc = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1,
      )
      const ray = new THREE.Raycaster()
      ray.setFromCamera(ndc, camera)
      const dir = ray.ray.direction.clone().normalize()

      let best: string | null = null
      let bestDot = -1
      for (const c of centroids) {
        const d = dir.dot(c.dir)
        if (d > bestDot) {
          bestDot = d
          best = c.id
        }
      }
      // ~25 degrees; beyond that the click is empty sky.
      onPick(bestDot > 0.9 ? best : null)
    }
    el.addEventListener('click', click)
    return () => el.removeEventListener('click', click)
  }, [gl, camera, centroids, onPick])

  return null
}

/* ------------------------------------------------------------------ *
 * Public component
 * ------------------------------------------------------------------ */

export interface SkyViewerProps {
  sky: SkyData
  constellations: Constellation[]
  activeId: string | null
  onSelect: (id: string | null) => void
  focusId?: string | null
  className?: string
}

export function SkyViewer({
  sky,
  constellations,
  activeId,
  onSelect,
  focusId,
  className = '',
}: SkyViewerProps) {
  const reduced = useMemo(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  }, [])

  const look = useRef<LookState>({
    theta: 1.2,
    phi: Math.PI / 2,
    fov: 60,
    targetTheta: 1.2,
    targetPhi: Math.PI / 2,
    targetFov: 60,
    dragging: false,
  })

  const centroids = useCentroids(constellations)

  // Swing the view to a constellation when one is chosen from the list.
  useEffect(() => {
    if (!focusId) return
    const c = centroids.find((x) => x.id === focusId)
    if (!c) return
    const sph = new THREE.Spherical().setFromVector3(c.dir)
    look.current.targetPhi = THREE.MathUtils.clamp(sph.phi, 0.06, Math.PI - 0.06)

    // Take the shorter way round instead of unwinding the long way.
    let t = sph.theta
    const cur = look.current.targetTheta
    while (t - cur > Math.PI) t -= Math.PI * 2
    while (cur - t > Math.PI) t += Math.PI * 2
    look.current.targetTheta = t
    look.current.targetFov = 34
  }, [focusId, centroids])

  return (
    <div className={`relative ${className}`}>
      <Canvas
        camera={{ position: [0, 0, 0], fov: 60, near: 0.1, far: 300 }}
        dpr={[1, 2]}
        gl={{ antialias: false, alpha: true, powerPreference: 'high-performance' }}
        style={{ background: 'transparent', touchAction: 'none', cursor: 'grab' }}
      >
        <Stars sky={sky} reduced={reduced} />
        <ConstellationLines constellations={constellations} activeId={activeId} />
        <LookRig look={look} />
        <Picker constellations={constellations} onPick={onSelect} />
        <EffectComposer>
          <Bloom intensity={0.55} luminanceThreshold={0.5} luminanceSmoothing={0.3} mipmapBlur radius={0.55} />
        </EffectComposer>
      </Canvas>
    </div>
  )
}

/** Hook that loads both datasets once and reports progress. */
export function useSkyData() {
  const [sky, setSky] = useState<SkyData | null>(null)
  const [constellations, setConstellations] = useState<Constellation[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const [s, c] = await Promise.all([loadSky(), loadConstellations()])
      setSky(s)
      setConstellations(c)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  return { sky, constellations, error }
}
