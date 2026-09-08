import { Hero } from '../components/Hero'
import { DeferredJourney } from '../components/DeferredJourney'

import { QuietBoundary } from '../components/QuietBoundary'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Star, Globe, Layers, Compass } from 'lucide-react'

const features = [
  {
    icon: Compass,
    title: 'Constellation Explorer',
    description: 'Navigate 88 official constellations with interactive maps, mythology, and linked deep-sky objects.',
  },
  {
    icon: Star,
    title: 'Star Profiles',
    description: 'Detailed scientific data including spectral class, luminosity, distance, and system membership.',
  },
  {
    icon: Globe,
    title: 'Star Systems',
    description: 'Explore hierarchical relationships from stars to planets and companion objects.',
  },
  {
    icon: Layers,
    title: 'Celestial Hierarchy',
    description: 'Intuitive zoom between Universe → Constellation → Star → System → Planet.',
  },
]

export function Home() {
  return (
    <div>
      <QuietBoundary>
        <DeferredJourney />
      </QuietBoundary>
      <Hero />

      <section className="section-padding py-24 md:py-32 relative z-10">
        <div className="container-wide">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-display-sm md:text-display-md font-semibold text-cosmos-pure mb-4">
              Designed for discovery
            </h2>
            <p className="text-cosmos-silver max-w-2xl mx-auto">
              A cinematic interface that makes complex astronomical data feel intuitive and beautiful.
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="card p-6"
              >
                <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center mb-4">
                  <f.icon className="w-5 h-5 text-cosmos-glow" />
                </div>
                <h3 className="font-semibold text-cosmos-pure mb-2">{f.title}</h3>
                <p className="text-sm text-cosmos-silver leading-relaxed">{f.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="section-padding py-24 relative z-10 border-t border-white/5">
        <div className="container-narrow text-center">
          <h2 className="text-display-sm md:text-display-md font-semibold text-cosmos-pure mb-4">
            From the cosmos to you
          </h2>
          <p className="text-cosmos-silver mb-10 max-w-xl mx-auto">
            Free exploration of the universe. Premium insights into your personal sky.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/explore" className="btn-primary">
              Start Exploring
            </Link>
            <Link to="/pricing" className="btn-secondary">
              View Pricing
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
