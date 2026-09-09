import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Loader2, ExternalLink } from 'lucide-react'
import { assetUrl, formatLy, loadNebulae, type Nebula } from '../lib/astro'

export function Nebulae() {
  const [list, setList] = useState<Nebula[] | null>(null)

  useEffect(() => {
    loadNebulae().then(setList).catch(() => setList([]))
  }, [])

  if (!list) return <Loading />

  return (
    <div className="section-padding container-wide pt-24 pb-20">
      <p className="text-[11px] font-medium tracking-[0.28em] uppercase text-[#9b8cff]/90 mb-3">
        Catalogue
      </p>
      <h1 className="text-[2rem] md:text-[2.75rem] font-semibold tracking-[-0.02em] text-[#f0f0f8] mb-3">
        Deep sky
      </h1>
      <p className="text-[#a0a0b8] max-w-2xl text-[15px] leading-relaxed mb-10">
        Real imagery from NASA, Hubble, Spitzer and Herschel — public-domain plates with their
        original credit. Grouped by what each object actually is: a nebula is gas and dust inside
        our own galaxy, a galaxy is a separate island of billions of stars, and a cluster is a
        gravitationally bound group.
      </p>

      {GROUPS.map((g) => {
        const items = list.filter((n) => n.category === g.key)
        if (!items.length) return null
        return (
          <section key={g.key} className="mb-12">
            <div className="flex items-baseline gap-3 mb-1">
              <h2 className="text-[1.3rem] font-semibold text-[#f0f0f8]">{g.title}</h2>
              <span className="text-[12px] font-mono text-[#6b6b85]">{items.length}</span>
            </div>
            <p className="text-[13px] text-[#a0a0b8] mb-5 max-w-2xl">{g.blurb}</p>
            <Grid items={items} />
          </section>
        )
      })}
    </div>
  )
}

const GROUPS = [
  {
    key: 'nebula' as const,
    title: 'Nebulae',
    blurb:
      'Clouds of gas and dust within the Milky Way — some lit by the stars forming inside them, some the debris of stars that have died.',
  },
  {
    key: 'galaxy' as const,
    title: 'Galaxies',
    blurb:
      'Separate systems of billions of stars, far outside our own. Distances here jump from thousands of light-years to millions.',
  },
  {
    key: 'cluster' as const,
    title: 'Star clusters',
    blurb:
      'Groups of stars bound by gravity and born together, so every member shares an age and a chemistry.',
  },
]

function Grid({ items }: { items: Nebula[] }) {
  return (
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {items.map((n) => (
          <Link
            key={n.slug}
            to={`/nebulae/${n.slug}`}
            className="group rounded-2xl overflow-hidden border border-white/[0.07]
                       hover:border-[#7c6aff]/40 transition-all"
          >
            <div className="aspect-[4/3] overflow-hidden bg-black">
              <img
                src={assetUrl(n.image)}
                alt={n.name}
                loading="lazy"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-[900ms]"
              />
            </div>
            <div className="p-4">
              <h2 className="text-[15px] font-semibold text-[#f0f0f8] mb-0.5">{n.name}</h2>
              <p className="text-[12px] text-[#a0a0b8] mb-2">{n.catalog}</p>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-[#6b6b85]">{n.type}</span>
                <span className="font-mono text-[#6b6b85]">{n.distanceLy.toLocaleString()} ly</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
  )
}

export function NebulaDetail() {
  const { slug } = useParams<{ slug: string }>()
  const [list, setList] = useState<Nebula[] | null>(null)

  useEffect(() => {
    loadNebulae().then(setList).catch(() => setList([]))
  }, [])

  if (!list) return <Loading />

  const n = list.find((x) => x.slug === slug)
  if (!n) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-[#f0f0f8]">No nebula matches “{slug}”.</p>
        <Link to="/nebulae" className="text-[#9b8cff] hover:text-[#c084fc] text-sm">
          All nebulae →
        </Link>
      </div>
    )
  }

  return (
    <div className="section-padding container-wide pt-24 pb-20">
      <Link
        to="/nebulae"
        className="inline-flex items-center gap-2 text-[13px] text-[#a0a0b8] hover:text-[#f0f0f8] transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> All nebulae
      </Link>

      <p className="text-[11px] font-medium tracking-[0.28em] uppercase text-[#9b8cff]/90 mb-2">
        {n.catalog}
      </p>
      <h1 className="text-[2.2rem] md:text-[3rem] font-semibold tracking-[-0.02em] text-[#f0f0f8] mb-6">
        {n.name}
      </h1>

      <div className="rounded-2xl overflow-hidden border border-white/[0.07] bg-black mb-3">
        <img src={assetUrl(n.image)} alt={n.name} className="w-full" />
      </div>
      <p className="text-[11px] text-[#6b6b85] mb-10">
        {n.nasaTitle ? `“${n.nasaTitle}” · ` : ''}Credit: {n.credit} ·{' '}
        <a
          href={n.source}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-[#9b8cff] hover:text-[#c084fc]"
        >
          NASA source <ExternalLink className="w-3 h-3" />
        </a>
      </p>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        <Stat label="Type" value={n.type} />
        <Stat label="Distance" value={formatLy(n.distanceLy)} />
        <Stat label="Apparent magnitude" value={String(n.apparentMag)} />
        <Stat label="Radius" value={`${n.radiusLy} ly`} />
      </div>

      {n.description && (
        <>
          <h2 className="text-[1.25rem] font-semibold text-[#f0f0f8] mb-3">From NASA</h2>
          <p className="text-[15px] text-[#a0a0b8] leading-relaxed max-w-3xl mb-10">
            {n.description}
          </p>
        </>
      )}

      <Link
        to={`/constellations/${n.conId}`}
        className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-4 py-2.5
                   text-[13px] text-[#f0f0f8] hover:bg-white/[0.05] transition-colors"
      >
        Find it in {n.constellation} →
      </Link>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
      <p className="text-[11px] uppercase tracking-wider text-[#6b6b85] mb-1.5">{label}</p>
      <p className="text-[#f0f0f8] text-[15px] font-medium">{value}</p>
    </div>
  )
}

function Loading() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center">
      <div className="flex items-center gap-3 text-[#a0a0b8]">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-sm">Loading…</span>
      </div>
    </div>
  )
}
