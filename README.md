# Lumen — Cosmic Exploration & Personalized Astrology

**Explore the universe. Understand the stars. Discover yourself.**

Lumen is a premium web experience with two clearly separated layers:

1. **Free Astronomy** — Immersive exploration of constellations, stars, systems, and celestial data
2. **Premium Astrology** — Personalized birth-chart experience (entertainment / self-reflection)

Visual language inspired by high-end product launches (cinematic dark UI, luminous fields, refined typography) while remaining fully original.

## Stack

- React 19 + TypeScript
- Vite 8
- Tailwind CSS 3
- Framer Motion
- Three.js + React Three Fiber + Drei
- React Router
- Lucide icons

## Quick start (Mac)

```bash
# Clone
git clone https://github.com/roylegend25/lumen-cosmos.git
cd lumen-cosmos

# Install
npm install --legacy-peer-deps

# Run
npm run dev
```

Open the URL shown in the terminal (usually http://localhost:5173).

### Useful scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |
| `npm run lint` | Run Oxlint |

## Project structure

```
src/
  components/
    StarField.tsx       # R3F star-field canvas + CSS fallback
    CelestialScene.tsx  # Interactive 3D explore scene
    Hero.tsx
    Navbar.tsx
    Footer.tsx
  pages/
    Home.tsx
    Explore.tsx         # Search + interactive 3D canvas
    Constellations.tsx
    ConstellationDetail.tsx
    Stars.tsx
    StarDetail.tsx
    Astrology.tsx       # Premium birth-info → chart flow
    Pricing.tsx
  data/
    constellations.ts   # Placeholder scientific data
    stars.ts
  lib/utils.ts
```

## Design system

- Dark void backgrounds (`cosmos-void`, `cosmos-deep`, `cosmos-night`)
- Accent purple / nebula / cyan glow tokens
- Glass cards, premium cards, glow shadows
- Display typography scale
- Reduced-motion support

## Notes for handoff

- Astronomy data is structured placeholder data only — ready to swap for real APIs later.
- Astrology is presented as personalized entertainment, not scientific fact.
- 3D star fields use `@react-three/fiber` and `@react-three/drei`. Prefer `--legacy-peer-deps` if peer dependency resolution complains.
- Node modules are gitignored; always run `npm install` after clone.

## License

Private / personal project. All rights reserved unless otherwise stated.
