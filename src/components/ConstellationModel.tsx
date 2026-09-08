import { useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, type ThreeEvent } from '@react-three/fiber'
import { OrbitControls, Html } from '@react-three/drei'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import * as THREE from 'three'
import {
  bvToRGB,
  greekLetter,
  magToBrightness,
  radecToVec3,
  type Constellation,
  type ConstellationStar,
} from '../lib/astro'
import { STAR_SPRITE_FRAG, STAR_SPRITE_VERT, starSpriteUniforms } from '../lib/starShader'

/**
 * Two ways to look at a constellation:
 *
 *  - "pattern" flattens every star onto a sphere, which is the figure as it
 *    appears from Earth — the shape people actually recognise.
 *  - "true3d" places each star at its catalogued distance, which pulls the
 *    figure apart and shows that the pattern is a line-of-sight coincidence.
 */
export type ViewMode = 'pattern' | 'true3d'

const SHELL = 42

function starPosition(s: ConstellationStar, mode: ViewMode, maxLy: number): THREE.Vector3 {
  if (mode === 'pattern' || !s.ly) return radecToVec3(s.ra, s.dec, SHELL)
  // Compress the radial axis logarithmically; raw light-years span three
  // orders of magnitude and would push everything into a single far clump.
  const t = Math.log10(1 + s.ly) / Math.log10(1 + maxLy)
  return radecToVec3(s.ra, s.dec, 14 + t * 62)
}

/**
 * All stars in one draw call as sprites rather than one sphere mesh each:
 * spheres shade flat and read as dots, and dozens of meshes cost more than
 * a single buffer.
 */
function StarSprites({
  stars,
  mode,
  maxLy,
  onHover,
}: {
  stars: ConstellationStar[]
  mode: ViewMode
  maxLy: number
  onHover: (i: number | null) => void
}) {
  const mat = useRef<THREE.ShaderMaterial>(null)

  const { positions, colors, sizes, phases } = useMemo(() => {
    const n = stars.length
    const positions = new Float32Array(n * 3)
    const colors = new Float32Array(n * 3)
    const sizes = new Float32Array(n)
    const phases = new Float32Array(n)

    for (let i = 0; i < n; i++) {
      const s = stars[i]
      const p = starPosition(s, mode, maxLy)
      positions[i * 3] = p.x
      positions[i * 3 + 1] = p.y
      positions[i * 3 + 2] = p.z

      const [r, g, b] = bvToRGB(s.ci)
      colors[i * 3] = r
      colors[i * 3 + 1] = g
      colors[i * 3 + 2] = b

      // Wide dynamic range so first-magnitude stars clearly dominate.
      // Raised to a power so first-magnitude stars clearly dominate the
      // figure instead of every member reading at a similar weight.
      sizes[i] = 0.55 + Math.pow(magToBrightness(s.mag, 6), 1.55) * 4.3
      phases[i] = (i * 0.6180339887) % 1
    }
    return { positions, colors, sizes, phases }
  }, [stars, mode, maxLy])

  useFrame((state) => {
    if (mat.current) mat.current.uniforms.uTime.value = state.clock.elapsedTime
  })

  const uniforms = useMemo(
    () => starSpriteUniforms({ scale: 0.8, spikes: 0.52, halo: 0.3, twinkle: 0.16 }),
    [],
  )

  return (
    <points
      frustumCulled={false}
      onPointerMove={(e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation()
        if (typeof e.index === 'number') onHover(e.index)
      }}
      onPointerOut={() => onHover(null)}
    >
      <bufferGeometry key={`${stars.length}-${mode}`}>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-aColor" args={[colors, 3]} />
        <bufferAttribute attach="attributes-aSize" args={[sizes, 1]} />
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

function FigureLines({
  constellation,
  mode,
  maxLy,
}: {
  constellation: Constellation
  mode: ViewMode
  maxLy: number
}) {
  const positions = useMemo(() => {
    const pts: number[] = []

    // Figure vertices are sky coordinates, not catalogue entries, so in true-3D
    // mode each endpoint borrows the depth of the nearest catalogued star.
    const withDepth = (ra: number, dec: number): THREE.Vector3 => {
      if (mode === 'pattern') return radecToVec3(ra, dec, SHELL)
      let best: ConstellationStar | null = null
      let bestD = Infinity
      for (const s of constellation.stars) {
        const d = (s.ra - ra) ** 2 + (s.dec - dec) ** 2
        if (d < bestD) {
          bestD = d
          best = s
        }
      }
      return best ? starPosition(best, mode, maxLy) : radecToVec3(ra, dec, SHELL)
    }

    for (const seg of constellation.segments) {
      for (let i = 0; i < seg.length - 1; i++) {
        const a = withDepth(seg[i][0], seg[i][1])
        const b = withDepth(seg[i + 1][0], seg[i + 1][1])
        pts.push(a.x, a.y, a.z, b.x, b.y, b.z)
      }
    }
    return new Float32Array(pts)
  }, [constellation, mode, maxLy])

  if (!positions.length) return null

  return (
    <lineSegments frustumCulled={false}>
      <bufferGeometry key={`${positions.length}-${mode}`}>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <lineBasicMaterial
        color="#8ea2ff"
        transparent
        opacity={mode === 'pattern' ? 0.42 : 0.22}
        depthWrite={false}
      />
    </lineSegments>
  )
}

export function ConstellationModel({
  constellation,
  mode,
  spin = true,
  onInteract,
  className = '',
}: {
  constellation: Constellation
  mode: ViewMode
  spin?: boolean
  onInteract?: () => void
  className?: string
}) {
  const [hover, setHover] = useState<number | null>(null)

  // Reach a little fainter than naked eye so figures have depth behind the
  // headline stars, but not so far that the shape drowns.
  const stars = useMemo(
    () => constellation.stars.filter((s) => s.mag <= 5.6).slice(0, 48),
    [constellation],
  )

  const maxLy = useMemo(() => {
    const ds = stars.map((s) => s.ly).filter((d): d is number => !!d)
    return ds.length ? Math.max(...ds) : 1000
  }, [stars])

  const hovered = hover !== null ? stars[hover] : null

  /**
   * Every figure sits wherever its right ascension puts it, so without this a
   * constellation lands off in a corner and cannot be inspected. Rotating its
   * centroid onto the camera axis centres any of the 88 the same way.
   */
  const { quaternion, distance } = useMemo(() => {
    const centroid = new THREE.Vector3()
    for (const s of stars) centroid.add(radecToVec3(s.ra, s.dec, 1))
    if (centroid.lengthSq() < 1e-9) centroid.set(0, 0, 1)
    centroid.normalize()

    const q = new THREE.Quaternion().setFromUnitVectors(centroid, new THREE.Vector3(0, 0, 1))

    let maxAngle = 0
    for (const s of stars) {
      maxAngle = Math.max(maxAngle, centroid.angleTo(radecToVec3(s.ra, s.dec, 1)))
    }
    const spread = Math.max(0.12, Math.min(maxAngle, 0.85))
    const extent = Math.sin(spread) * SHELL
    const fov = (48 * Math.PI) / 180
    const dist = SHELL + Math.max(26, (extent * 1.9) / Math.tan(fov / 2) - SHELL)

    return { quaternion: q, distance: Math.min(240, Math.max(58, dist)) }
  }, [stars])

  return (
    <div className={`relative ${className}`}>
      <Canvas
        camera={{ position: [0, 0, distance], fov: 48, near: 0.1, far: 900 }}
        dpr={[1, 1.75]}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        // Points need an explicit pick radius; the default is far too tight
        // for sprite-sized stars.
        raycaster={{ params: { Points: { threshold: 1.6 } } as THREE.RaycasterParameters }}
        style={{ background: 'transparent' }}
      >
        <group quaternion={quaternion}>
          <FigureLines constellation={constellation} mode={mode} maxLy={maxLy} />
          <StarSprites stars={stars} mode={mode} maxLy={maxLy} onHover={setHover} />

          {hovered && (
            <Html center position={starPosition(hovered, mode, maxLy)} style={{ pointerEvents: 'none' }}>
              <div className="whitespace-nowrap rounded-lg border border-white/15 bg-[#0a0a12]/95 px-2.5 py-1.5 text-[11px] backdrop-blur-md -translate-y-8">
                <div className="text-[#f0f0f8] font-medium">
                  {hovered.n ?? greekLetter(hovered.b) ?? `HIP ${hovered.hip}`}
                </div>
                <div className="text-[#a0a0b8] font-mono text-[10px] mt-0.5">
                  mag {hovered.mag}
                  {hovered.ly ? ` · ${Math.round(hovered.ly).toLocaleString()} ly` : ''}
                  {hovered.sp ? ` · ${hovered.sp}` : ''}
                </div>
              </div>
            </Html>
          )}
        </group>

        {/* autoRotate is owned by the controls so any interaction stops it
            cleanly; a hand-rolled spin in useFrame fought the user's drag. */}
        <OrbitControls
          makeDefault
          enablePan={false}
          minDistance={Math.max(20, distance * 0.4)}
          maxDistance={distance * 2.6}
          zoomSpeed={0.8}
          rotateSpeed={0.55}
          autoRotate={spin}
          autoRotateSpeed={0.4}
          enableDamping
          dampingFactor={0.09}
          onStart={onInteract}
        />
        <EffectComposer>
          <Bloom intensity={0.55} luminanceThreshold={0.5} luminanceSmoothing={0.25} mipmapBlur radius={0.55} />
        </EffectComposer>
      </Canvas>
    </div>
  )
}
