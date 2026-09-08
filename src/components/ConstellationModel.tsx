import { useMemo, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Html } from '@react-three/drei'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import * as THREE from 'three'
import {
  bvToRGB,
  greekLetter,
  radecToVec3,
  type Constellation,
  type ConstellationStar,
} from '../lib/astro'

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

function StarPoints({
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
  const items = useMemo(
    () =>
      stars.map((s) => {
        const p = starPosition(s, mode, maxLy)
        const [r, g, b] = bvToRGB(s.ci)
        // Keep the spread wide but the absolute sizes small: with bloom on top,
        // large spheres merge into one mass and the figure stops being readable.
        const radius = 0.16 + Math.max(0, 5.6 - s.mag) * 0.125
        return { s, p, color: new THREE.Color(r, g, b), radius }
      }),
    [stars, mode, maxLy],
  )

  return (
    <group>
      {items.map((it, i) => (
        <mesh
          key={i}
          position={it.p}
          onPointerOver={(e) => {
            e.stopPropagation()
            onHover(i)
          }}
          onPointerOut={() => onHover(null)}
        >
          <sphereGeometry args={[it.radius, 16, 16]} />
          <meshBasicMaterial color={it.color} toneMapped={false} />
        </mesh>
      ))}
    </group>
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
    <group>
      <lineSegments frustumCulled={false}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        </bufferGeometry>
        <lineBasicMaterial
          color="#9b8cff"
          transparent
          opacity={mode === 'pattern' ? 0.75 : 0.35}
          depthWrite={false}
        />
      </lineSegments>
    </group>
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

  // Only the brighter members; the full tail is visual noise at this scale.
  const stars = useMemo(
    () => constellation.stars.filter((s) => s.mag <= 5.0).slice(0, 34),
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

    // Frame to the figure's own angular size so small and sprawling
    // constellations both fill the viewport sensibly.
    let maxAngle = 0
    for (const s of stars) {
      const d = radecToVec3(s.ra, s.dec, 1)
      maxAngle = Math.max(maxAngle, centroid.angleTo(d))
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
        style={{ background: 'transparent' }}
      >
        <group quaternion={quaternion}>
          <StarPoints stars={stars} mode={mode} maxLy={maxLy} onHover={setHover} />
          <FigureLines constellation={constellation} mode={mode} maxLy={maxLy} />

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
          autoRotateSpeed={0.45}
          enableDamping
          dampingFactor={0.09}
          onStart={onInteract}
        />
        <EffectComposer>
          <Bloom intensity={0.45} luminanceThreshold={0.62} luminanceSmoothing={0.25} mipmapBlur radius={0.45} />
        </EffectComposer>
      </Canvas>
    </div>
  )
}
