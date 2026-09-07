import { useState, Suspense } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Search, Star, Map } from 'lucide-react'
import { constellations } from '../data/constellations'
import { stars } from '../data/stars'
import { StarFieldCanvas } from '../components/StarField'

export function Explore() {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<'all' | 'constellations' | 'stars'>('all')

  const filteredConstellations = constellations.filter(
    (c) =>
      c.name.toLowerCase().includes(query.toLowerCase()) ||
      c.abbreviation.toLowerCase().includes(query.toLowerCase())
  )
  const filteredStars = stars.filter(
    (s) =>
      s.name.toLowerCase().includes(query.toLowerCase()) ||
      s.designation.toLowerCase().includes(query.toLowerCase())
  )

  return (
    <div className="min-h-screen pt-20 pb-16">
      <div className="relative w-full h-[36vh] min-h-[280px] max-h-[420px] border-b border-white/5 overflow-hidden">
        <Suspense fallback={<div className="absolute inset-0 bg-cosmos-void" />}>
          <StarFieldCanvas count={1800} radius={70} depth={50} size={0.12} speed={0.0002} />
        </Suspense>
        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-cosmos-void to-transparent pointer-events-none" />
      </div>

      <div className="section-padding container-wide pt-10">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
          <h1 className="text-display-sm md:text-display-md font-semibold text-cosmos-pure mb-3">
            Explore the Universe
          </h1>
          <p className="text-cosmos-silver max-w-xl">
            Search and navigate constellations, stars, and celestial objects. All astronomy content is free.
          </p>
        </motion.div>

        <div className="flex flex-col sm:flex-row gap-4 mb-10">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-cosmos-silver" />
            <input
              type="text"
              placeholder="Search constellations, stars, objects..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-3 rounded-full bg-cosmos-night/60 border border-white/10 text-cosmos-pure placeholder:text-cosmos-silver/50 focus:outline-none focus:border-cosmos-accent/50 transition-all"
            />
          </div>
          <div className="flex gap-2">
            {(['all', 'constellations', 'stars'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  filter === f ? 'bg-cosmos-accent text-white' : 'bg-white/5 text-cosmos-silver hover:bg-white/10'
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {(filter === 'all' || filter === 'constellations') && (
          <section className="mb-16">
            <div className="flex items-center gap-2 mb-6">
              <Map className="w-5 h-5 text-cosmos-glow" />
              <h2 className="text-lg font-semibold text-cosmos-pure">Constellations</h2>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredConstellations.map((c) => (
                <Link key={c.id} to={`/constellations/${c.id}`} className="card p-5 block group hover:border-cosmos-accent/30">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="font-semibold text-cosmos-pure group-hover:text-cosmos-star transition-colors">{c.name}</h3>
                    <span className="text-xs font-mono text-cosmos-silver bg-white/5 px-2 py-0.5 rounded">{c.abbreviation}</span>
                  </div>
                  <p className="text-sm text-cosmos-silver line-clamp-2 mb-3">{c.description}</p>
                  <div className="flex items-center gap-3 text-xs text-cosmos-silver/70">
                    <span>{c.hemisphere}</span><span>\u00b7</span><span>{c.area} deg\u00b2</span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {(filter === 'all' || filter === 'stars') && (
          <section>
            <div className="flex items-center gap-2 mb-6">
              <Star className="w-5 h-5 text-cosmos-glow" />
              <h2 className="text-lg font-semibold text-cosmos-pure">Stars</h2>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredStars.map((s) => (
                <Link key={s.id} to={`/stars/${s.id}`} className="card p-5 block group hover:border-cosmos-accent/30">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-cosmos-pure group-hover:text-cosmos-star transition-colors">{s.name}</h3>
                    <span className="text-xs font-mono text-cosmos-silver">mag {s.magnitude}</span>
                  </div>
                  <p className="text-xs font-mono text-cosmos-glow mb-2">{s.designation}</p>
                  <p className="text-sm text-cosmos-silver line-clamp-2 mb-3">{s.description}</p>
                  <div className="flex items-center gap-3 text-xs text-cosmos-silver/70">
                    <span>{s.spectralType}</span><span>\u00b7</span><span>{s.distance} ly</span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
