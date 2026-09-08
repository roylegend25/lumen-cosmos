import { useRef, useMemo, useEffect, useState, useCallback } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import * as THREE from 'three'
import {
  COMPASS,
  altAzToVec3,
  bvToRGB,
  julianDate,
  loadConstellations,
  loadSky,
  lstDeg,
  magToBrightness,
  raDecToAltAz,
  type Constellation,
  type Site,
  type SkyData,
} from '../lib/astro'

const SKY_R = 100

/* ------------------------------------------------------------------ *
 * Look controls — the observer stands still and turns their head.
 * ------------------------------------------------------------------ */

interface LookState {
  yaw: number
  pitch: number
  fov: number
  tYaw: number
  tPitch: number
  tFov: number
  dragging: boolean
}

function LookRig({
  look,
  onInteract,
}: {
  look: React.MutableRefObject<LookState>
  onInteract?: () => void
}) {
  const { camera, gl } = useThree()

  useEffect(() => {
    const el = gl.domElement
    let lastX = 0
    let lastY = 0
    let moved = 0

    const down = (e: PointerEvent) => {
      onInteract?.()
      look.current.dragging = true
      moved = 0
      lastX = e.clientX
      lastY = e.clientY
      el.setPointerCapture(e.pointerId)
      el.style.cursor = 'grabbing'
    }
    const move = (e: PointerEvent) => {
      if (!look.current.dragging) return
      const dx = e.clientX - lastX
      const dy = e.clientY - lastY
      lastX = e.clientX
      lastY = e.clientY
      moved += Math.abs(dx) + Math.abs(dy)
      const k = (look.current.fov / 60) * 0.0042
      look.current.tYaw -= dx * k
      // Allow a little below the horizon, but not a full somersault.
      look.current.tPitch = THREE.MathUtils.clamp(look.current.tPitch + dy * k, -0.32, 1.45)
    }
    const up = (e: PointerEvent) => {
      look.current.dragging = false
      try {
        el.releasePointerCapture(e.pointerId)
      } catch {
        /* already released */
      }
      el.style.cursor = 'grab'
      el.dataset.dragged = moved > 6 ? '1' : '0'
    }
    const wheel = (e: WheelEvent) => {
      e.preventDefault()
      onInteract?.()
      look.current.tFov = THREE.MathUtils.clamp(look.current.tFov + e.deltaY * 0.05, 12, 80)
    }

    el.style.cursor = 'grab'
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
  }, [gl, look, onInteract])

  useFrame((_, delta) => {
    const L = look.current
    const d = 1 - Math.pow(0.0001, delta)
    L.yaw += (L.tYaw - L.yaw) * d
    L.pitch += (L.tPitch - L.pitch) * d
    L.fov += (L.tFov - L.fov) * d

    const cam = camera as THREE.PerspectiveCamera
    if (Math.abs(cam.fov - L.fov) > 0.01) {
      cam.fov = L.fov
      cam.updateProjectionMatrix()
    }
    // yaw 0 looks due north (−Z); pitch raises the gaze toward the zenith.
    const cp = Math.cos(L.pitch)
    cam.lookAt(cp * Math.sin(L.yaw), Math.sin(L.pitch), -cp * Math.cos(L.yaw))
  })

  return null
}

/* ------------------------------------------------------------------ *
 * Stars
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
  varying float vBelow;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    // Scintillation is strongest near the horizon, as it is in reality.
    float horizonness = 1.0 - clamp(position.y / 40.0, 0.0, 1.0);
    vTw = 0.80 + 0.20 * sin(uTime * (1.2 + horizonness * 1.8) + aPhase * 6.2831853);
    vBelow = position.y < 0.0 ? 1.0 : 0.0;
    vColor = aColor;
    gl_PointSize = aSize * uPixelRatio * uFovScale;
  }
`

const SKY_FRAG = /* glsl */ `
  varying vec3 vColor;
  varying float vTw;
  varying float vBelow;

  void main() {
    vec2 p = (gl_PointCoord - 0.5) * 2.0;
    float d = length(p);
    if (d > 1.0) discard;

    // Core, halo and four-point diffraction spikes. A plain disc reads as a
    // dot; the spikes are what make the eye accept it as a star.
    float core = exp(-d * d * 26.0);
    float halo = exp(-d * 3.4) * 0.24;
    float ax = abs(p.x);
    float ay = abs(p.y);
    float sx = exp(-ax * ax * 340.0) * exp(-ay * 3.0);
    float sy = exp(-ay * ay * 340.0) * exp(-ax * 3.0);
    float spikes = (sx + sy) * 0.42;

    float i = (core + halo + spikes) * vTw;
    i *= smoothstep(1.0, 0.74, d);

    // Stars under the horizon are kept but heavily suppressed, so the sky
    // reads as a real hemisphere rather than a sphere floating in space.
    i *= mix(1.0, 0.05, vBelow);

    vec3 col = mix(vColor, vec3(1.0), core * 0.7);
    gl_FragColor = vec4(col * i, i);
  }
`

function Stars({
  sky,
  site,
  lst,
  reduced,
}: {
  sky: SkyData
  site: Site
  lst: number
  reduced: boolean
}) {
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
      const { alt, az } = raDecToAltAz(ra, dec, site.lat, lst)
      const v = altAzToVec3(alt, az, SKY_R)
      positions[i * 3] = v.x
      positions[i * 3 + 1] = v.y
      positions[i * 3 + 2] = v.z

      const [r, g, b] = bvToRGB(ci)
      colors[i * 3] = r
      colors[i * 3 + 1] = g
      colors[i * 3 + 2] = b

      // Power curve so first-magnitude stars stand out from the field.
      sizes[i] = 2.2 + Math.pow(magToBrightness(mag, sky.magLimit), 1.5) * 16
      phases[i] = (i * 0.6180339887) % 1
    }
    return { positions, colors, sizes, phases }
  }, [sky, site, lst])

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
    const cam = camera as THREE.PerspectiveCamera
    mat.current.uniforms.uFovScale.value = 60 / cam.fov
  })

  return (
    <points frustumCulled={false}>
      <bufferGeometry key={`${site.lat},${site.lon},${Math.round(lst)}`}>
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
 * Constellation figures, in the observer's frame
 * ------------------------------------------------------------------ */

function toLocal(ra: number, dec: number, site: Site, lst: number, r: number) {
  const { alt, az } = raDecToAltAz(ra, dec, site.lat, lst)
  return altAzToVec3(alt, az, r)
}

function ConstellationLines({
  constellations,
  activeId,
  site,
  lst,
}: {
  constellations: Constellation[]
  activeId: string | null
  site: Site
  lst: number
}) {
  const { base, active } = useMemo(() => {
    const b: number[] = []
    const a: number[] = []
    for (const c of constellations) {
      const target = c.id === activeId ? a : b
      const r = c.id === activeId ? SKY_R * 0.975 : SKY_R * 0.985
      for (const seg of c.segments) {
        for (let i = 0; i < seg.length - 1; i++) {
          const p = toLocal(seg[i][0], seg[i][1], site, lst, r)
          const q = toLocal(seg[i + 1][0], seg[i + 1][1], site, lst, r)
          // Skip figures wholly underfoot; drawing them adds clutter only.
          if (p.y < -12 && q.y < -12) continue
          target.push(p.x, p.y, p.z, q.x, q.y, q.z)
        }
      }
    }
    return { base: new Float32Array(b), active: new Float32Array(a) }
  }, [constellations, activeId, site, lst])

  return (
    <>
      {base.length > 0 && (
        <lineSegments frustumCulled={false}>
          <bufferGeometry key={`b${base.length}-${activeId}`}>
            <bufferAttribute attach="attributes-position" args={[base, 3]} />
          </bufferGeometry>
          <lineBasicMaterial color="#6478ff" transparent opacity={0.2} depthWrite={false} />
        </lineSegments>
      )}
      {active.length > 0 && (
        <lineSegments frustumCulled={false}>
          <bufferGeometry key={`a${active.length}-${activeId}`}>
            <bufferAttribute attach="attributes-position" args={[active, 3]} />
          </bufferGeometry>
          <lineBasicMaterial color="#b9a8ff" transparent opacity={1} depthWrite={false} />
        </lineSegments>
      )}
    </>
  )
}

/* ------------------------------------------------------------------ *
 * Ground, horizon ring and compass
 * ------------------------------------------------------------------ */

/**
 * drei's Html renders in the DOM regardless of whether its anchor is in front
 * of the camera, so a naive compass shows "S" while you are facing north.
 * This hides any marker that falls behind the view direction.
 */
function CompassLabel({ label, az }: { label: string; az: number }) {
  const el = useRef<HTMLDivElement>(null)
  const pos = useMemo(() => altAzToVec3(1.5, az, SKY_R * 0.96), [az])
  const cardinal = label.length === 1

  const fwd = useRef(new THREE.Vector3())
  useFrame(({ camera }) => {
    if (!el.current) return
    camera.getWorldDirection(fwd.current)
    const facing = fwd.current.dot(pos.clone().normalize())
    el.current.style.opacity = facing > 0.12 ? String(Math.min(1, (facing - 0.12) * 4)) : '0'
  })

  return (
    <Html center position={pos} style={{ pointerEvents: 'none' }}>
      <div
        ref={el}
        className={`font-mono tracking-widest select-none transition-none ${
          cardinal ? 'text-[13px] text-[#c9d1ff]' : 'text-[10px] text-[#7783b0]'
        }`}
        style={{ textShadow: '0 0 10px rgba(0,0,0,0.95)' }}
      >
        {label}
      </div>
    </Html>
  )
}

function Horizon() {
  const ring = useMemo(() => {
    const pts: number[] = []
    const N = 240
    for (let i = 0; i < N; i++) {
      const a = (i / N) * 360
      const b = ((i + 1) / N) * 360
      const p = altAzToVec3(0, a, SKY_R * 0.99)
      const q = altAzToVec3(0, b, SKY_R * 0.99)
      pts.push(p.x, p.y, p.z, q.x, q.y, q.z)
    }
    return new Float32Array(pts)
  }, [])

  return (
    <>
      {/* Opaque ground so nothing below the horizon shows through. */}
      <mesh position={[0, -0.4, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[SKY_R * 1.4, 64]} />
        <meshBasicMaterial color="#05050a" transparent opacity={0.94} depthWrite={false} />
      </mesh>

      <lineSegments frustumCulled={false}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[ring, 3]} />
        </bufferGeometry>
        <lineBasicMaterial color="#4a5580" transparent opacity={0.55} depthWrite={false} />
      </lineSegments>

      {COMPASS.map((c) => (
        <CompassLabel key={c.label} label={c.label} az={c.az} />
      ))}
    </>
  )
}

/* ------------------------------------------------------------------ *
 * Picking
 * ------------------------------------------------------------------ */

function useCentroids(constellations: Constellation[], site: Site, lst: number) {
  return useMemo(
    () =>
      constellations.map((c) => {
        const v = new THREE.Vector3()
        let n = 0
        for (const seg of c.segments) {
          for (const [ra, dec] of seg) {
            v.add(toLocal(ra, dec, site, lst, 1))
            n++
          }
        }
        if (!n) {
          for (const s of c.stars) {
            v.add(toLocal(s.ra, s.dec, site, lst, 1))
            n++
          }
        }
        if (n) v.divideScalar(n).normalize()
        return { id: c.id, dir: v }
      }),
    [constellations, site, lst],
  )
}

function Picker({
  centroids,
  onPick,
}: {
  centroids: { id: string; dir: THREE.Vector3 }[]
  onPick: (id: string | null) => void
}) {
  const { gl, camera } = useThree()

  useEffect(() => {
    const el = gl.domElement
    const click = (e: MouseEvent) => {
      if (el.dataset.dragged === '1') return
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
      onPick(bestDot > 0.9 ? best : null)
    }
    el.addEventListener('click', click)
    return () => el.removeEventListener('click', click)
  }, [gl, camera, centroids, onPick])

  return null
}

/* ------------------------------------------------------------------ *
 * Public
 * ------------------------------------------------------------------ */

/**
 * Slowly walks the view across constellations that are currently above the
 * horizon, pausing on each. Any drag, zoom or manual selection cancels it —
 * a tour that fights the user is worse than no tour.
 */
function AutoTour({
  enabled,
  order,
  centroids,
  look,
  onArrive,
}: {
  enabled: boolean
  order: string[]
  centroids: { id: string; dir: THREE.Vector3 }[]
  look: React.MutableRefObject<LookState>
  onArrive: (id: string) => void
}) {
  const idx = useRef(0)
  const holdUntil = useRef(0)

  useFrame((state) => {
    if (!enabled || order.length === 0) return
    const t = state.clock.elapsedTime
    if (t < holdUntil.current) return

    const id = order[idx.current % order.length]
    const c = centroids.find((x) => x.id === id)
    idx.current += 1
    holdUntil.current = t + 7

    if (!c) return
    const pitch = Math.asin(THREE.MathUtils.clamp(c.dir.y, -1, 1))
    const yaw = Math.atan2(c.dir.x, -c.dir.z)

    look.current.tPitch = THREE.MathUtils.clamp(pitch, 0.05, 1.4)
    let y = yaw
    while (y - look.current.tYaw > Math.PI) y -= Math.PI * 2
    while (look.current.tYaw - y > Math.PI) y += Math.PI * 2
    look.current.tYaw = y
    look.current.tFov = 46

    onArrive(id)
  })

  return null
}

export interface SkyViewerProps {
  sky: SkyData
  constellations: Constellation[]
  site: Site
  date: Date
  activeId: string | null
  onSelect: (id: string | null) => void
  focusId?: string | null
  tour?: boolean
  tourOrder?: string[]
  onTourStep?: (id: string) => void
  onUserInteract?: () => void
  className?: string
}

export function SkyViewer({
  sky,
  constellations,
  site,
  date,
  activeId,
  onSelect,
  focusId,
  tour = false,
  tourOrder = [],
  onTourStep,
  onUserInteract,
  className = '',
}: SkyViewerProps) {
  const reduced = useMemo(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  }, [])

  const lst = useMemo(() => lstDeg(julianDate(date), site.lon), [date, site.lon])

  const look = useRef<LookState>({
    yaw: 0,
    pitch: 0.45,
    fov: 62,
    tYaw: 0,
    tPitch: 0.45,
    tFov: 62,
    dragging: false,
  })

  const centroids = useCentroids(constellations, site, lst)

  useEffect(() => {
    if (!focusId) return
    const c = centroids.find((x) => x.id === focusId)
    if (!c) return
    const d = c.dir
    const pitch = Math.asin(THREE.MathUtils.clamp(d.y, -1, 1))
    const yaw = Math.atan2(d.x, -d.z)

    look.current.tPitch = THREE.MathUtils.clamp(pitch, -0.3, 1.45)
    let y = yaw
    while (y - look.current.tYaw > Math.PI) y -= Math.PI * 2
    while (look.current.tYaw - y > Math.PI) y += Math.PI * 2
    look.current.tYaw = y
    look.current.tFov = 38
  }, [focusId, centroids])

  return (
    <div className={`relative ${className}`}>
      <Canvas
        camera={{ position: [0, 0, 0], fov: 62, near: 0.1, far: 400 }}
        dpr={[1, 2]}
        gl={{ antialias: false, alpha: true, powerPreference: 'high-performance' }}
        style={{ background: 'transparent', touchAction: 'none' }}
      >
        <Stars sky={sky} site={site} lst={lst} reduced={reduced} />
        <ConstellationLines
          constellations={constellations}
          activeId={activeId}
          site={site}
          lst={lst}
        />
        <Horizon />
        <LookRig look={look} onInteract={onUserInteract} />
        <AutoTour
          enabled={tour}
          order={tourOrder}
          centroids={centroids}
          look={look}
          onArrive={(id) => onTourStep?.(id)}
        />
        <Picker centroids={centroids} onPick={onSelect} />
        <EffectComposer>
          <Bloom intensity={0.6} luminanceThreshold={0.5} luminanceSmoothing={0.3} mipmapBlur radius={0.6} />
        </EffectComposer>
      </Canvas>
    </div>
  )
}

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
