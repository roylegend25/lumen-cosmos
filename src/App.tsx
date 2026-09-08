import { Suspense, lazy } from 'react'
import { Routes, Route } from 'react-router-dom'
import { Navbar } from './components/Navbar'
import { Footer } from './components/Footer'
import { Home } from './pages/Home'

/**
 * Every route except Home is split out.
 *
 * Three.js and the postprocessing stack dominate this bundle, and parsing all
 * of it before first paint was the single largest blocking task on load —
 * ~1.9s in profiling. Home stays eager because it is the entry point; the
 * rest arrive when navigated to.
 */
const Explore = lazy(() => import('./pages/Explore').then((m) => ({ default: m.Explore })))
const Sky = lazy(() => import('./pages/Sky').then((m) => ({ default: m.Sky })))
const Nebulae = lazy(() => import('./pages/Nebulae').then((m) => ({ default: m.Nebulae })))
const NebulaDetail = lazy(() => import('./pages/Nebulae').then((m) => ({ default: m.NebulaDetail })))
const Constellations = lazy(() =>
  import('./pages/Constellations').then((m) => ({ default: m.Constellations })),
)
const ConstellationDetail = lazy(() =>
  import('./pages/ConstellationDetail').then((m) => ({ default: m.ConstellationDetail })),
)
const Stars = lazy(() => import('./pages/Stars').then((m) => ({ default: m.Stars })))
const StarDetail = lazy(() => import('./pages/StarDetail').then((m) => ({ default: m.StarDetail })))
const Astrology = lazy(() => import('./pages/Astrology').then((m) => ({ default: m.Astrology })))
const Pricing = lazy(() => import('./pages/Pricing').then((m) => ({ default: m.Pricing })))

function RouteFallback() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border border-[#7c6aff]/30 border-t-[#9b8cff] animate-spin" />
    </div>
  )
}

function App() {
  return (
    <div className="min-h-screen flex flex-col bg-cosmos-void">
      <Navbar />
      <main className="flex-1">
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/explore" element={<Explore />} />
            <Route path="/sky" element={<Sky />} />
            <Route path="/nebulae" element={<Nebulae />} />
            <Route path="/nebulae/:slug" element={<NebulaDetail />} />
            <Route path="/constellations" element={<Constellations />} />
            <Route path="/constellations/:id" element={<ConstellationDetail />} />
            <Route path="/stars" element={<Stars />} />
            <Route path="/stars/:id" element={<StarDetail />} />
            <Route path="/astrology" element={<Astrology />} />
            <Route path="/pricing" element={<Pricing />} />
          </Routes>
        </Suspense>
      </main>
      <Footer />
    </div>
  )
}

export default App
