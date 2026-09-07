import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, X, Sparkles } from 'lucide-react'
import { cn } from '../lib/utils'

const navLinks = [
  { name: 'Open Sky', path: '/sky' },
  { name: 'Constellations', path: '/constellations' },
  { name: 'Nebulae', path: '/nebulae' },
  { name: 'Stars', path: '/stars' },
  { name: 'Astrology', path: '/astrology' },
  { name: 'Pricing', path: '/pricing' },
]

export function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    setMobileOpen(false)
  }, [location.pathname])

  return (
    <header
      className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-500',
        scrolled ? 'bg-cosmos-void/80 backdrop-blur-xl border-b border-white/5' : 'bg-transparent'
      )}
    >
      <nav className="section-padding container-wide flex items-center justify-between h-16 md:h-20">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="relative w-8 h-8">
            <div className="absolute inset-0 rounded-full bg-cosmos-accent/30 blur-md group-hover:bg-cosmos-accent/50 transition-all" />
            <div className="relative w-full h-full rounded-full bg-gradient-to-br from-cosmos-accent to-cosmos-nebula flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
          </div>
          <span className="font-semibold text-cosmos-pure tracking-tight text-lg">Lumen</span>
        </Link>

        <div className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className={cn(
                'btn-ghost text-[13px] tracking-wide',
                location.pathname.startsWith(link.path) && 'text-cosmos-pure bg-white/5'
              )}
            >
              {link.name}
            </Link>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-3">
          <Link to="/astrology" className="btn-primary text-[13px]">
            Discover Yourself
          </Link>
        </div>

        <button
          className="md:hidden p-2 text-cosmos-silver hover:text-cosmos-pure"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </nav>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden glass-strong border-t border-white/5 overflow-hidden"
          >
            <div className="section-padding py-6 flex flex-col gap-2">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className={cn(
                    'px-4 py-3 rounded-xl text-sm font-medium transition-colors',
                    location.pathname.startsWith(link.path)
                      ? 'bg-white/10 text-cosmos-pure'
                      : 'text-cosmos-silver hover:bg-white/5 hover:text-cosmos-pure'
                  )}
                >
                  {link.name}
                </Link>
              ))}
              <Link to="/astrology" className="btn-primary mt-4 justify-center">
                Discover Yourself
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}
