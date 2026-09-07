import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { stars } from '../data/stars'
import { constellations } from '../data/constellations'

export function Stars() {
  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="section-padding container-wide">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-12">
          <h1 className="text-display-sm md:text-display-md font-semibold text-cosmos-pure mb-3">
            Stars
          </h1>
          <p className="text-cosmos-silver max-w-xl">
            Detailed profiles of notable stars with scientific classifications, distances, and system information.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {stars.map((s, i) => {
            const constellation = constellations.find(c => c.id === s.constellationId)
            return (
              <motion.div
                key={s.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Link to={`/stars/${s.id}`} className="card p-6 block h-full group hover:border-cosmos-accent/30">
                  <div className="flex items-start justify-between mb-2">
                    <h2 className="text-lg font-semibold text-cosmos-pure group-hover:text-cosmos-star transition-colors">
                      {s.name}
                    </h2>
                    <span className="text-xs font-mono text-cosmos-silver">mag {s.magnitude}</span>
                  </div>
                  <p className="text-xs font-mono text-cosmos-glow mb-3">{s.designation}</p>
                  <p className="text-sm text-cosmos-silver line-clamp-2 mb-4">{s.description}</p>
                  <div className="flex flex-wrap gap-2 text-xs text-cosmos-silver/70">
                    <span>{s.spectralType}</span>
                    <span>\u00b7</span>
                    <span>{s.distance} ly</span>
                    {constellation && (
                      <>
                        <span>\u00b7</span>
                        <span>{constellation.name}</span>
                      </>
                    )}
                  </div>
                </Link>
              </motion.div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
