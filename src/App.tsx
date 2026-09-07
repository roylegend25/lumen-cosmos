import { Routes, Route } from 'react-router-dom'
import { Navbar } from './components/Navbar'
import { Footer } from './components/Footer'
import { Home } from './pages/Home'
import { Explore } from './pages/Explore'
import { Constellations } from './pages/Constellations'
import { ConstellationDetail } from './pages/ConstellationDetail'
import { Stars } from './pages/Stars'
import { StarDetail } from './pages/StarDetail'
import { Astrology } from './pages/Astrology'
import { Pricing } from './pages/Pricing'

function App() {
  return (
    <div className="min-h-screen flex flex-col bg-cosmos-void">
      <Navbar />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/explore" element={<Explore />} />
          <Route path="/constellations" element={<Constellations />} />
          <Route path="/constellations/:id" element={<ConstellationDetail />} />
          <Route path="/stars" element={<Stars />} />
          <Route path="/stars/:id" element={<StarDetail />} />
          <Route path="/astrology" element={<Astrology />} />
          <Route path="/pricing" element={<Pricing />} />
        </Routes>
      </main>
      <Footer />
    </div>
  )
}

export default App
