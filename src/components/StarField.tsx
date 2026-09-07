import { useRef, useMemo } from 'react'
import { useFrame, Canvas } from '@react-three/fiber'
import { Points, PointMaterial } from '@react-three/drei'
import * as THREE from 'three'

interface StarFieldProps {
  count?: number
  radius?: number
  depth?: number
  size?: number
  color?: string
  speed?: number
  className?: string
  interactive?: boolean
}

function Stars({
  count = 2500,
  radius = 100,
  depth = 80,
  size = 0.12,
  color = '#e0d4ff',
  speed = 0.00015,
}: Omit<StarFieldProps, 'className' | 'interactive'>) {
  const ref = useRef<THREE.Points>(null)
  const prefersReducedMotion = useMemo(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  }, [])

  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      const r = radius * (0.4 + Math.random() * 0.6)
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta)
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
      pos[i * 3 + 2] = (Math.random() - 0.5) * depth * 2
    }
    return pos
  }, [count, radius, depth])

  useFrame((state) => {
    if (!ref.current || prefersReducedMotion) return
    const t = state.clock.getElapsedTime()
    ref.current.rotation.y = t * speed
    ref.current.rotation.x = Math.sin(t * speed * 0.5) * 0.05
  })

  return (
    <Points ref={ref} positions={positions} stride={3} frustumCulled={false}>
      <PointMaterial
        transparent
        color={color}
        size={size}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        opacity={0.85}
      />
    </Points>
  )
}

function NebulaGlow() {
  const mesh = useRef<THREE.Mesh>(null)
  useFrame((state) => {
    if (!mesh.current) return
    const t = state.clock.getElapsedTime()
    mesh.current.rotation.z = t * 0.02
    const mat = mesh.current.material as THREE.MeshBasicMaterial
    mat.opacity = 0.12 + Math.sin(t * 0.3) * 0.04
  })

  return (
    <mesh ref={mesh} scale={[40, 40, 1]} position={[0, 0, -30]}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial
        color="#7c6aff"
        transparent
        opacity={0.15}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </mesh>
  )
}

export function StarFieldCanvas({
  count = 2200,
  className = '',
  interactive = false,
  ...props
}: StarFieldProps) {
  return (
    <div className={`absolute inset-0 ${className}`} aria-hidden="true">
      <Canvas
        camera={{ position: [0, 0, 40], fov: 60, near: 0.1, far: 200 }}
        dpr={[1, 1.5]}
        gl={{
          antialias: false,
          alpha: true,
          powerPreference: 'high-performance',
        }}
        style={{ background: 'transparent' }}
      >
        <Stars count={count} {...props} />
        <NebulaGlow />
        {interactive && <ambientLight intensity={0.1} />}
      </Canvas>
    </div>
  )
}

/** Lightweight CSS-fallback star field for reduced-motion or low-power devices */
export function StarFieldCSS({ className = '' }: { className?: string }) {
  const stars = useMemo(() => {
    return Array.from({ length: 80 }).map((_, i) => ({
      id: i,
      left: `${(i * 17 + 7) % 100}%`,
      top: `${(i * 23 + 11) % 100}%`,
      size: 1 + (i % 3),
      opacity: 0.25 + ((i * 13) % 50) / 100,
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
