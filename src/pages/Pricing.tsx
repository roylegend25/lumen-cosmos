import { motion } from 'framer-motion'
import { Check, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'

const freeFeatures = [
  'Full constellation browser',
  'Star & system profiles',
  'Scientific astronomical data',
  'Search & filters',
  'Celestial hierarchy navigation',
]

const premiumFeatures = [
  'Everything in Free',
  'Personalized birth chart',
  'Planetary positions & houses',
  'Personality & life themes',
  'Career & finance insights',
  'Relationship compatibility',
  'Transit & future interpretations',
  'Downloadable reports',
]

export function Pricing() {
  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="section-padding container-wide">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-16">
          <h1 className="text-display-sm md:text-display-md font-semibold text-cosmos-pure mb-4">
            Simple, transparent pricing
          </h1>
          <p className="text-cosmos-silver max-w-xl mx-auto">
            Explore the universe for free. Unlock personalized astrology when you are ready.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          <div className="card p-8">
            <h3 className="text-lg font-semibold text-cosmos-pure mb-1">Astronomy</h3>
            <p className="text-sm text-cosmos-silver mb-6">Free forever</p>
            <div className="text-3xl font-semibold text-cosmos-pure mb-8">$0</div>
            <ul className="space-y-3 mb-8">
              {freeFeatures.map((f) => (
                <li key={f} className="flex items-start gap-3 text-sm text-cosmos-silver">
                  <Check className="w-4 h-4 text-cosmos-glow mt-0.5 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            <Link to="/explore" className="btn-secondary w-full justify-center">Start Exploring</Link>
          </div>

          <div className="card-premium p-8 relative">
            <div className="absolute top-4 right-4 px-3 py-1 rounded-full bg-cosmos-accent/20 text-cosmos-star text-xs font-medium flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> Popular
            </div>
            <h3 className="text-lg font-semibold text-cosmos-pure mb-1">Lumen Premium</h3>
            <p className="text-sm text-cosmos-silver mb-6">Personalized astrology</p>
            <div className="flex items-baseline gap-1 mb-8">
              <span className="text-3xl font-semibold text-cosmos-pure">$29</span>
              <span className="text-cosmos-silver text-sm">/ month</span>
            </div>
            <ul className="space-y-3 mb-8">
              {premiumFeatures.map((f) => (
                <li key={f} className="flex items-start gap-3 text-sm text-cosmos-silver">
                  <Check className="w-4 h-4 text-cosmos-star mt-0.5 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            <Link to="/astrology" className="btn-primary w-full justify-center">Unlock Premium</Link>
          </div>
        </div>

        <p className="text-center text-xs text-cosmos-silver/60 mt-12 max-w-md mx-auto">
          Astrology content is provided for entertainment and self-reflection. It is not presented as scientific fact.
        </p>
      </div>
    </div>
  )
}
