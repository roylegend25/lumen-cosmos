import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { constellations } from '../data/constellations'

export function Constellations() {
  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="section-padding container-wide">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-12">
          <h1 className="text-display-sm md:text-display-md font-semibold text-cosmos-pure mb-3">
            Constellations
          </h1>
          <p className="text-cosmos-silver max-w-xl">
            Browse the official constellations of the night sky. Select one to explore its stars and objects.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {constellations.map((c, i) => (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Link to={`/constellations/${c.id}`} className="card p-6 block h-full group hover:border-cosmos-accent/30">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-lg font-semibold text-cosmos-pure group-hover:text-cosmos-star transition-colors">
                    {c.name}
                  </h2>
                  <span className="font-mono text-xs text-cosmos-glow bg-cosmos-accent/10 px-2 py-1 rounded">
                    {c.abbreviation}
                  </span>
                </div>
                <p className="text-sm text-cosmos-silver line-clamp-3 mb-4">{c.description}</p>
                <div className="flex flex-wrap gap-2 text-xs text-cosmos-silver/70">
                  <span>{c.hemisphere}</span>
                  <span>\u00b7</span>
                  <span>{c.area} deg\u00b2</span>
                  <span>\u00b7</span>
                  <span>{c.majorStars.length} major stars</span>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}
