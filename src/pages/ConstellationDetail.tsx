import { useParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, Star, MapPin, Eye } from 'lucide-react'
import { Suspense } from 'react'
import { constellations } from '../data/constellations'
import { stars } from '../data/stars'
import { StarFieldCanvas } from '../components/StarField'

export function ConstellationDetail() {
  const { id } = useParams()
  const constellation = constellations.find((c) => c.id === id)
  const relatedStars = stars.filter((s) => s.constellationId === id)

  if (!constellation) {
    return (
      <div className="min-h-screen pt-32 section-padding text-center">
        <p className="text-cosmos-silver">Constellation not found.</p>
        <Link to="/constellations" className="btn-secondary mt-4 inline-flex">
          Back
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="section-padding container-wide">
        <Link
          to="/constellations"
          className="inline-flex items-center gap-2 text-sm text-cosmos-silver hover:text-cosmos-pure mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> All constellations
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid lg:grid-cols-2 gap-12 mb-16"
        >
          <div>
            <div className="flex items-center gap-3 mb-4">
              <h1 className="text-display-sm md:text-display-md font-semibold text-cosmos-pure">
                {constellation.name}
              </h1>
              <span className="font-mono text-sm text-cosmos-glow bg-cosmos-accent/10 px-3 py-1 rounded-full">
                {constellation.abbreviation}
              </span>
            </div>
            <p className="text-cosmos-silver leading-relaxed mb-8">{constellation.description}</p>

            <div className="grid grid-cols-2 gap-4">
              <div className="card p-4">
                <div className="flex items-center gap-2 text-cosmos-silver text-xs mb-1">
                  <Eye className="w-3.5 h-3.5" /> Visibility
                </div>
                <p className="text-sm text-cosmos-pure">{constellation.visibility}</p>
              </div>
              <div className="card p-4">
                <div className="flex items-center gap-2 text-cosmos-silver text-xs mb-1">
                  <MapPin className="w-3.5 h-3.5" /> Hemisphere
                </div>
                <p className="text-sm text-cosmos-pure">{constellation.hemisphere}</p>
              </div>
              <div className="card p-4">
                <div className="text-cosmos-silver text-xs mb-1">Area</div>
                <p className="text-sm text-cosmos-pure">{constellation.area} square degrees</p>
              </div>
              <div className="card p-4">
                <div className="text-cosmos-silver text-xs mb-1">Genitive</div>
                <p className="text-sm text-cosmos-pure font-mono">{constellation.genitive}</p>
              </div>
            </div>
          </div>

          <div className="card relative overflow-hidden min-h-[340px] rounded-2xl">
            <Suspense fallback={<div className="absolute inset-0 bg-[#050508]" />}>
              <StarFieldCanvas dense={false} className="opacity-100" />
            </Suspense>
            <div className="absolute inset-0 bg-gradient-to-t from-[#050508]/90 via-transparent to-transparent pointer-events-none" />
            <div className="absolute bottom-6 left-0 right-0 text-center pointer-events-none">
              <p className="text-sm text-cosmos-pure font-medium">{constellation.name}</p>
              <p className="text-xs text-cosmos-silver/70 mt-1">Field visualization</p>
            </div>
          </div>
        </motion.div>

        {relatedStars.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold text-cosmos-pure mb-6 flex items-center gap-2">
              <Star className="w-5 h-5 text-cosmos-glow" /> Major Stars
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {relatedStars.map((s) => (
                <Link
                  key={s.id}
                  to={`/stars/${s.id}`}
                  className="card p-5 group hover:border-cosmos-accent/30"
                >
                  <h3 className="font-semibold text-cosmos-pure group-hover:text-cosmos-star transition-colors">
                    {s.name}
                  </h3>
                  <p className="text-xs font-mono text-cosmos-glow mb-2">{s.designation}</p>
                  <div className="flex gap-3 text-xs text-cosmos-silver">
                    <span>mag {s.magnitude}</span>
                    <span>{s.spectralType}</span>
                    <span>{s.distance} ly</span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {constellation.notableObjects.length > 0 && (
          <section className="mt-12">
            <h2 className="text-lg font-semibold text-cosmos-pure mb-4">Notable Objects</h2>
            <div className="flex flex-wrap gap-2">
              {constellation.notableObjects.map((obj) => (
                <span
                  key={obj}
                  className="px-3 py-1.5 rounded-full bg-white/5 text-sm text-cosmos-silver border border-white/5"
                >
                  {obj}
                </span>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
