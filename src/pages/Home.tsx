import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, Telescope, Sparkles, Star, Globe, Layers, Compass } from 'lucide-react'
import { Suspense } from 'react'
import { StarFieldCanvas } from '../components/StarField'

const features = [
  { icon: Compass, title: 'Constellation Explorer', description: 'Navigate constellations with interactive maps, mythology, and linked deep-sky objects.' },
  { icon: Star, title: 'Star Profiles', description: 'Detailed scientific data including spectral class, luminosity, distance, and system membership.' },
  { icon: Globe, title: 'Star Systems', description: 'Explore hierarchical relationships from stars to planets and companion objects.' },
  { icon: Layers, title: 'Celestial Hierarchy', description: 'Intuitive zoom between Universe \u2192 Constellation \u2192 Star \u2192 System \u2192 Planet.' },
]

export function Home() {
  return (
    <div>
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-cosmos-void" />
        <Suspense fallback={null}>
          <StarFieldCanvas count={2800} radius={90} depth={70} size={0.11} color="#e8e0ff" speed={0.00012} className="opacity-90" />
        </Suspense>
        <div className="absolute inset-0 bg-cosmos-gradient pointer-events-none" />
        <div className="absolute inset-0 bg-hero-glow opacity-50 pointer-events-none" />

        <div className="relative z-10 section-padding container-wide text-center pt-24 pb-16">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
            <p className="text-sm md:text-base font-medium text-cosmos-glow tracking-widest uppercase mb-6">
              Cosmic Intelligence Platform
            </p>
            <h1 className="text-display-md md:text-display-lg lg:text-display-xl font-semibold text-cosmos-pure max-w-4xl mx-auto mb-6">
              Explore the universe.<br />
              <span className="text-gradient">Understand the stars.</span><br />
              Discover yourself.
            </h1>
            <p className="text-base md:text-lg text-cosmos-silver max-w-2xl mx-auto mb-12 leading-relaxed">
              Free immersive astronomy exploration meets premium personalized astrology.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/explore" className="btn-primary text-base px-8 py-3.5 group">
                <Telescope className="w-4 h-4" /> Explore the Universe
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </Link>
              <Link to="/astrology" className="btn-secondary text-base px-8 py-3.5">
                <Sparkles className="w-4 h-4" /> Personalized Astrology
              </Link>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.3 }} className="mt-20 md:mt-28 grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            <Link to="/explore" className="card p-8 text-left group hover:border-cosmos-accent/30 hover:shadow-glow-sm transition-all duration-500">
              <div className="w-10 h-10 rounded-xl bg-cosmos-accent/10 flex items-center justify-center mb-5">
                <Telescope className="w-5 h-5 text-cosmos-glow" />
              </div>
              <h3 className="text-lg font-semibold text-cosmos-pure mb-2">Free Astronomy</h3>
              <p className="text-sm text-cosmos-silver leading-relaxed">Browse constellations, explore stars and systems — all free.</p>
            </Link>
            <Link to="/astrology" className="card-premium p-8 text-left group transition-all duration-500">
              <div className="w-10 h-10 rounded-xl bg-cosmos-accent/20 flex items-center justify-center mb-5">
                <Sparkles className="w-5 h-5 text-cosmos-star" />
              </div>
              <h3 className="text-lg font-semibold text-cosmos-pure mb-2">Premium Astrology</h3>
              <p className="text-sm text-cosmos-silver leading-relaxed">Birth chart, planetary positions, personality, career, relationships.</p>
            </Link>
          </motion.div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-cosmos-void to-transparent pointer-events-none" />
      </section>

      <section className="section-padding py-24 md:py-32 relative">
        <div className="container-wide">
          <div className="text-center mb-16">
            <h2 className="text-display-sm md:text-display-md font-semibold text-cosmos-pure mb-4">Designed for discovery</h2>
            <p className="text-cosmos-silver max-w-2xl mx-auto">A cinematic interface that makes complex astronomical data feel intuitive and beautiful.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((f) => (
              <div key={f.title} className="card p-6">
                <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center mb-4">
                  <f.icon className="w-5 h-5 text-cosmos-glow" />
                </div>
                <h3 className="font-semibold text-cosmos-pure mb-2">{f.title}</h3>
                <p className="text-sm text-cosmos-silver leading-relaxed">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
