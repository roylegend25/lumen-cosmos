import { useMemo, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Html } from '@react-three/drei'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import * as THREE from 'three'
import { bvToRGB, radecToVec3, type BrightStar } from '../lib/astro'

/**
 * A true-volume map: every star sits at its catalogued distance from the Sun,
 * so this is the actual local neighbourhood rather than a projection of it.
 */
export function StarMap3D({
  stars,
  radiusLy,
  selectedSlug,
  onSelect,
  className = '',
}: {
  stars: BrightStar[]
  radiusLy: number
  selectedSlug: string | null
  onSelect: (slug: string) => void
  className?: string
}) {
  const [hover, setHover] = useState<number | null>(null)

  const items = useMemo(() => {
    const within = stars.filter((s) => s.ly !== null && s.ly <= radiusLy)
    // Map light-years onto a fixed viewport so changing radius reframes
    // rather than shrinking everything into the middle.
    const k = 46 / radiusLy
    return within.map((s) => {
      const p = radecToVec3(s.ra, s.dec, (s.ly as number) * k)
      const [r, g, b] = bvToRGB(s.ci)
      // Absolute magnitude drives size here: this is a map of real luminosity,
      // not of how bright a star happens to look from Earth.
      const abs = s.absmag ?? 5
      const radius = THREE.MathUtils.clamp(0.82 - abs * 0.062, 0.16, 0.95)
      return { s, p, color: new THREE.Color(r, g, b), radius }
    })
  }, [stars, radiusLy])

  const hovered = hover !== null ? items[hover] : null

  return (
    <div className={`relative ${className}`}>
      <Canvas
        camera={{ position: [0, 26, 96], fov: 46, near: 0.1, far: 900 }}
        dpr={[1, 1.75]}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        style={{ background: 'transparent' }}
      >
        {/* The Sun marks the origin so distances read from somewhere. */}
        <mesh>
          <sphereGeometry args={[0.5, 24, 24]} />
          <meshBasicMaterial color="#fff3c4" toneMapped={false} />
        </mesh>
        <Html center position={[0, -2.6, 0]} style={{ pointerEvents: 'none' }}>
          <div className="text-[10px] font-mono text-[#9a9ab5] whitespace-nowrap">Sun</div>
        </Html>

        {items.map((it, i) => (
          <mesh
            key={it.s.slug}
            position={it.p}
            onPointerOver={(e) => {
              e.stopPropagation()
              setHover(i)
              document.body.style.cursor = 'pointer'
            }}
            onPointerOut={() => {
              setHover(null)
              document.body.style.cursor = ''
            }}
            onClick={(e) => {
              e.stopPropagation()
              onSelect(it.s.slug)
            }}
          >
            <sphereGeometry args={[it.radius, 14, 14]} />
            <meshBasicMaterial
              color={it.color}
              toneMapped={false}
              transparent
              opacity={selectedSlug && selectedSlug !== it.s.slug ? 0.35 : 1}
            />
          </mesh>
        ))}

        {hovered && (
          <Html center position={hovered.p} style={{ pointerEvents: 'none' }}>
            <div className="whitespace-nowrap rounded-lg border border-white/15 bg-[#0a0a12]/95 px-2.5 py-1.5 backdrop-blur-md -translate-y-7">
              <div className="text-[11px] text-[#f0f0f8] font-medium">
                {hovered.s.name ?? `HIP ${hovered.s.hip}`}
              </div>
              <div className="text-[10px] text-[#a0a0b8] font-mono mt-0.5">
                {hovered.s.ly?.toFixed(1)} ly · mag {hovered.s.mag}
                {hovered.s.sp ? ` · ${hovered.s.sp}` : ''}
              </div>
            </div>
          </Html>
        )}

        <OrbitControls
          makeDefault
          enablePan={false}
          minDistance={20}
          maxDistance={340}
          zoomSpeed={0.8}
          rotateSpeed={0.55}
          enableDamping
          dampingFactor={0.09}
          autoRotate
          autoRotateSpeed={0.28}
        />
        <EffectComposer>
          <Bloom intensity={0.32} luminanceThreshold={0.78} luminanceSmoothing={0.2} mipmapBlur radius={0.4} />
        </EffectComposer>
      </Canvas>

      <div className="absolute left-3 top-3 rounded-lg border border-white/10 bg-[#0a0a12]/85 px-2.5 py-1.5 backdrop-blur-md pointer-events-none">
        <p className="text-[10px] font-mono text-[#a0a0b8]">
          {items.length} stars within {radiusLy} ly
        </p>
      </div>
    </div>
  )
}
