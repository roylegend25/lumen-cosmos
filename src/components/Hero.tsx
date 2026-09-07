import { Suspense } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { ArrowRight, Telescope, Sparkles } from 'lucide-react'
import { StarFieldCanvas } from './StarField'

export function Hero() {
  return (
    <section className="relative min-h-[100svh] flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0 bg-[#050508]" />

      <Suspense
        fallback={
          <div className="absolute inset-0 bg-[#050508] flex items-center justify-center">
            <div className="w-12 h-12 rounded-full border border-[#7c6aff]/30 border-t-[#9b8cff] animate-spin" />
          </div>
        }
      >
        <StarFieldCanvas dense className="opacity-100" />
      </Suspense>

      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 80% 70% at 50% 45%, transparent 0%, rgba(5,5,8,0.15) 45%, rgba(5,5,8,0.75) 100%)',
        }}
      />
      <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-[#050508]/90 to-transparent pointer-events-none" />
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#050508] to-transparent pointer-events-none" />

      <div className="relative z-10 section-padding container-wide text-center pt-28 pb-20">
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.0, ease: [0.16, 1, 0.3, 1] }}
        >
          <p className="text-[11px] md:text-xs font-medium tracking-[0.28em] uppercase text-[#9b8cff]/90 mb-8">
            Cosmic Intelligence Platform
          </p>

          <h1 className="text-[2.4rem] sm:text-[3.2rem] md:text-[4rem] lg:text-[4.75rem] font-semibold tracking-[-0.03em] leading-[1.05] text-[#f0f0f8] max-w-4xl mx-auto mb-7">
            Explore the universe.
            <br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#e0d4ff] via-[#9b8cff] to-[#67e8f9]">
              Understand the stars.
            </span>
            <br />
            Discover yourself.
          </h1>

          <p className="text-[15px] md:text-base text-[#a0a0b8] max-w-xl mx-auto mb-12 leading-relaxed font-normal">
            Free immersive astronomy. Premium personalized astrology.{' '}
            <br className="hidden sm:block" />
            One continuum from the sky to you.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5">
            <Link
              to="/explore"
              className="group inline-flex items-center gap-2.5 px-7 py-3.5 rounded-full bg-[#7c6aff] text-white text-sm font-medium
                         shadow-[0_0_32px_rgba(124,106,255,0.35)] hover:bg-[#9b8cff] hover:shadow-[0_0_48px_rgba(124,106,255,0.45)]
                         transition-all duration-300"
            >
              <Telescope className="w-4 h-4" />
              Explore the Universe
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
            <Link
              to="/astrology"
              className="inline-flex items-center gap-2.5 px-7 py-3.5 rounded-full bg-white/[0.04] text-[#f0f0f8] text-sm font-medium
                         border border-white/10 hover:bg-white/[0.08] hover:border-white/20
                         transition-all duration-300 backdrop-blur-sm"
            >
              <Sparkles className="w-4 h-4 text-[#e0d4ff]" />
              Personalized Astrology
            </Link>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 36 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.0, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="mt-20 md:mt-28 grid md:grid-cols-2 gap-4 max-w-3xl mx-auto"
        >
          <Link
            to="/explore"
            className="group relative rounded-2xl p-7 text-left overflow-hidden
                       bg-[#0f0f1a]/70 border border-white/[0.06]
                       hover:border-[#7c6aff]/35 hover:shadow-[0_0_40px_rgba(124,106,255,0.12)]
                       transition-all duration-500 backdrop-blur-xl"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-[#7c6aff]/[0.04] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="relative">
              <div className="w-9 h-9 rounded-xl bg-[#7c6aff]/10 flex items-center justify-center mb-4 group-hover:bg-[#7c6aff]/20 transition-colors">
                <Telescope className="w-4 h-4 text-[#9b8cff]" />
              </div>
              <h3 className="text-[15px] font-semibold text-[#f0f0f8] mb-1.5 tracking-tight">Free Astronomy</h3>
              <p className="text-[13px] text-[#a0a0b8] leading-relaxed">
                Constellations, stars, systems, magnitudes, spectral types — explore without a paywall.
              </p>
            </div>
          </Link>

          <Link
            to="/astrology"
            className="group relative rounded-2xl p-7 text-left overflow-hidden
                       bg-gradient-to-br from-[#1a1a2e]/90 to-[#0f0f1a]/90
                       border border-[#7c6aff]/20
                       hover:border-[#7c6aff]/45 hover:shadow-[0_0_48px_rgba(124,106,255,0.2)]
                       transition-all duration-500 backdrop-blur-xl"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-[#7c6aff]/[0.08] via-transparent to-[#67e8f9]/[0.04]" />
            <div className="relative">
              <div className="w-9 h-9 rounded-xl bg-[#7c6aff]/20 flex items-center justify-center mb-4">
                <Sparkles className="w-4 h-4 text-[#e0d4ff]" />
              </div>
              <h3 className="text-[15px] font-semibold text-[#f0f0f8] mb-1.5 tracking-tight">Premium Astrology</h3>
              <p className="text-[13px] text-[#a0a0b8] leading-relaxed">
                Birth chart, houses, personality, career, relationships — private and personalized.
              </p>
            </div>
          </Link>
        </motion.div>
      </div>
    </section>
  )
}
