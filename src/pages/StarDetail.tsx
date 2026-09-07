import { useParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft } from 'lucide-react'
import { Suspense } from 'react'
import { stars } from '../data/stars'
import { constellations } from '../data/constellations'
import { StarFieldCanvas } from '../components/StarField'

export function StarDetail() {
  const { id } = useParams()
  const star = stars.find((s) => s.id === id)
  const constellation = star ? constellations.find((c) => c.id === star.constellationId) : null

  if (!star) {
    return (
      <div className="min-h-screen pt-32 section-padding text-center">
        <p className="text-cosmos-silver">Star not found.</p>
        <Link to="/stars" className="btn-secondary mt-4 inline-flex">
          Back
        </Link>
      </div>
    )
  }

  const stats = [
    { label: 'Distance', value: `${star.distance} ly` },
    { label: 'Magnitude', value: star.magnitude.toString() },
    { label: 'Temperature', value: `${star.temperature.toLocaleString()} K` },
    { label: 'Spectral Type', value: star.spectralType },
  ]
  if (star.mass) stats.push({ label: 'Mass', value: `${star.mass} M☉` })
  if (star.radius) stats.push({ label: 'Radius', value: `${star.radius} R☉` })
  if (star.luminosity)
    stats.push({ label: 'Luminosity', value: `${star.luminosity.toLocaleString()} L☉` })
  if (star.age) stats.push({ label: 'Age', value: star.age })

  return (
    <div className="min-h-screen pt-24 pb-16 relative">
      <div className="fixed inset-0 pointer-events-none opacity-35 -z-10">
        <Suspense fallback={null}>
          <StarFieldCanvas dense={false} />
        </Suspense>
      </div>

      <div className="section-padding container-wide relative z-10">
        <Link
          to="/stars"
          className="inline-flex items-center gap-2 text-sm text-cosmos-silver hover:text-cosmos-pure mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> All stars
        </Link>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          {constellation && (
            <Link
              to={`/constellations/${constellation.id}`}
              className="text-sm text-cosmos-glow hover:underline mb-2 inline-block"
            >
              {constellation.name}
            </Link>
          )}
          <h1 className="text-display-sm md:text-display-md font-semibold text-cosmos-pure mb-2">
            {star.name}
          </h1>
          <p className="font-mono text-cosmos-glow mb-6">{star.designation}</p>
          <p className="text-cosmos-silver leading-relaxed max-w-2xl mb-12">{star.description}</p>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
            {stats.map((stat) => (
              <div key={stat.label} className="card p-5">
                <div className="text-xs text-cosmos-silver mb-1">{stat.label}</div>
                <div className="text-lg font-semibold text-cosmos-pure font-mono">{stat.value}</div>
              </div>
            ))}
          </div>

          <div className="card p-6 mb-8">
            <h3 className="text-sm font-medium text-cosmos-silver mb-3">Celestial Coordinates</h3>
            <div className="grid sm:grid-cols-2 gap-4 font-mono text-sm">
              <div>
                <span className="text-cosmos-silver">RA </span>
                <span className="text-cosmos-pure">{star.coordinates.ra}</span>
              </div>
              <div>
                <span className="text-cosmos-silver">Dec </span>
                <span className="text-cosmos-pure">{star.coordinates.dec}</span>
              </div>
            </div>
          </div>

          {star.system && (
            <div className="card p-6">
              <h3 className="text-sm font-medium text-cosmos-silver mb-2">Star System</h3>
              <p className="text-cosmos-pure">{star.system}</p>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  )
}
