import { Link } from 'react-router-dom'
import { Sparkles } from 'lucide-react'

export function Footer() {
  return (
    <footer className="border-t border-white/5 mt-auto">
      <div className="section-padding container-wide py-12">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-cosmos-accent to-cosmos-nebula flex items-center justify-center">
              <Sparkles className="w-3 h-3 text-white" />
            </div>
            <span className="font-semibold text-cosmos-pure">Lumen</span>
          </div>
          <nav className="flex flex-wrap items-center justify-center gap-6 text-sm text-cosmos-silver">
            <Link to="/explore" className="hover:text-cosmos-pure transition-colors">Explore</Link>
            <Link to="/constellations" className="hover:text-cosmos-pure transition-colors">Constellations</Link>
            <Link to="/astrology" className="hover:text-cosmos-pure transition-colors">Astrology</Link>
            <Link to="/pricing" className="hover:text-cosmos-pure transition-colors">Pricing</Link>
          </nav>
          <p className="text-xs text-cosmos-silver/50">
            © {new Date().getFullYear()} Lumen Cosmos
          </p>
        </div>
      </div>
    </footer>
  )
}
