import { useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, type ThreeEvent } from '@react-three/fiber'
import { OrbitControls, Html } from '@react-three/drei'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import * as THREE from 'three'
import { bvToRGB, radecToVec3, type BrightStar } from '../lib/astro'
import { STAR_SPRITE_FRAG, STAR_SPRITE_VERT, starSpriteUniforms } from '../lib/starShader'

function StarPoints({
  positions,
  colors,
  sizes,
  phases,
  count,
  radiusLy,
  onPointerMove,
  onPointerOut,
  onClick,
}: {
  positions: Float32Array
  colors: Float32Array
  sizes: Float32Array
  phases: Float32Array
  count: number
  radiusLy: number
  onPointerMove: (e: ThreeEvent<PointerEvent>) => void
  onPointerOut: () => void
  onClick: (e: ThreeEvent<MouseEvent>) => void
}) {
  const mat = useRef<THREE.ShaderMaterial>(null)
  const uniforms = useMemo(
    () => starSpriteUniforms({ scale: 1.7, spikes: 0.5, halo: 0.3, twinkle: 0.14 }),
    [],
  )

  useFrame((state) => {
    if (mat.current) mat.current.uniforms.uTime.value = state.clock.elapsedTime
  })

  return (
    <points
      frustumCulled={false}
      onPointerMove={onPointerMove}
      onPointerOut={onPointerOut}
      onClick={onClick}
    >
      <bufferGeometry key={`${count}-${radiusLy}`}>
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

/**
 * A true-volume map: every star sits at its catalogued distance from the Sun,
 * so this is the actual local neighbourhood rather than a projection of it.
 */
export function StarMap3D({
  stars,
  radiusLy,
  onSelect,
  className = '',
}: {
  stars: BrightStar[]
  radiusLy: number
  onSelect: (slug: string) => void
  className?: string
}) {
  const [hover, setHover] = useState<number | null>(null)

  const { within, positions, colors, sizes, phases } = useMemo(() => {
    const within = stars.filter((s) => s.ly !== null && s.ly <= radiusLy)
    // Map light-years onto a fixed viewport so changing radius reframes
    // rather than shrinking everything into the middle.
    const k = 46 / radiusLy

    const n = within.length
    const positions = new Float32Array(n * 3)
    const colors = new Float32Array(n * 3)
    const sizes = new Float32Array(n)
    const phases = new Float32Array(n)

    for (let i = 0; i < n; i++) {
      const s = within[i]
      const p = radecToVec3(s.ra, s.dec, (s.ly as number) * k)
      positions[i * 3] = p.x
      positions[i * 3 + 1] = p.y
      positions[i * 3 + 2] = p.z

      const [r, g, b] = bvToRGB(s.ci)
      colors[i * 3] = r
      colors[i * 3 + 1] = g
      colors[i * 3 + 2] = b

      // Absolute magnitude, not apparent: this is a map of real luminosity,
      // so a dim nearby red dwarf stays small next to a distant giant.
      const abs = s.absmag ?? 5
      sizes[i] = THREE.MathUtils.clamp(4.6 - abs * 0.34, 0.9, 6.2)
      phases[i] = (i * 0.6180339887) % 1
    }
    return { within, positions, colors, sizes, phases }
  }, [stars, radiusLy])

  const hovered = hover !== null ? within[hover] : null
  const hoveredPos = useMemo(() => {
    if (!hovered || hover === null) return null
    return new THREE.Vector3(
      positions[hover * 3],
      positions[hover * 3 + 1],
      positions[hover * 3 + 2],
    )
  }, [hovered, hover, positions])

  return (
    <div className={`relative ${className}`}>
      <Canvas
        camera={{ position: [0, 26, 96], fov: 46, near: 0.1, far: 900 }}
        dpr={[1, 1.75]}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        raycaster={{ params: { Points: { threshold: 1.4 } } as THREE.RaycasterParameters }}
        style={{ background: 'transparent' }}
      >
        {/* The Sun marks the origin so distances read from somewhere. */}
        <mesh>
          <sphereGeometry args={[0.45, 24, 24]} />
          <meshBasicMaterial color="#fff3c4" toneMapped={false} />
        </mesh>
        <Html center position={[0, -2.4, 0]} style={{ pointerEvents: 'none' }}>
          <div className="text-[10px] font-mono text-[#9a9ab5] whitespace-nowrap">Sun</div>
        </Html>

        <StarPoints
          positions={positions}
          colors={colors}
          sizes={sizes}
          phases={phases}
          count={within.length}
          radiusLy={radiusLy}
          onPointerMove={(e: ThreeEvent<PointerEvent>) => {
            e.stopPropagation()
            if (typeof e.index === 'number') {
              setHover(e.index)
              document.body.style.cursor = 'pointer'
            }
          }}
          onPointerOut={() => {
            setHover(null)
            document.body.style.cursor = ''
          }}
          onClick={(e: ThreeEvent<MouseEvent>) => {
            e.stopPropagation()
            if (typeof e.index === 'number' && within[e.index]) onSelect(within[e.index].slug)
          }}
        />

        {hovered && hoveredPos && (
          <Html center position={hoveredPos} style={{ pointerEvents: 'none' }}>
            <div className="whitespace-nowrap rounded-lg border border-white/15 bg-[#0a0a12]/95 px-2.5 py-1.5 backdrop-blur-md -translate-y-7">
              <div className="text-[11px] text-[#f0f0f8] font-medium">
                {hovered.name ?? `HIP ${hovered.hip}`}
              </div>
              <div className="text-[10px] text-[#a0a0b8] font-mono mt-0.5">
                {hovered.ly?.toFixed(1)} ly · mag {hovered.mag}
                {hovered.sp ? ` · ${hovered.sp}` : ''}
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
          <Bloom intensity={0.62} luminanceThreshold={0.45} luminanceSmoothing={0.26} mipmapBlur radius={0.55} />
        </EffectComposer>
      </Canvas>

      <div className="absolute left-3 top-3 rounded-lg border border-white/10 bg-[#0a0a12]/85 px-2.5 py-1.5 backdrop-blur-md pointer-events-none">
        <p className="text-[10px] font-mono text-[#a0a0b8]">
          {within.length} stars within {radiusLy} ly
        </p>
      </div>
    </div>
  )
}
