import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Loader2, Orbit, Layers } from 'lucide-react'
import { ConstellationModel, type ViewMode } from '../components/ConstellationModel'
import { assetUrl } from '../lib/astro'
import {
  designation,
  formatLy,
  loadConstellations,
  loadNebulae,
  type Constellation,
  type Nebula,
} from '../lib/astro'

export function ConstellationDetail() {
  const { id } = useParams<{ id: string }>()
  const [all, setAll] = useState<Constellation[] | null>(null)
  const [nebulae, setNebulae] = useState<Nebula[]>([])
  const [mode, setMode] = useState<ViewMode>('pattern')
  const [spin, setSpin] = useState(true)

  useEffect(() => {
    loadConstellations().then(setAll).catch(() => setAll([]))
    loadNebulae().then(setNebulae).catch(() => setNebulae([]))
  }, [])

  const c = useMemo(() => {
    if (!all || !id) return null
    const key = id.toLowerCase()
    return (
      all.find((x) => x.id.toLowerCase() === key) ??
      all.find((x) => x.name.toLowerCase() === key) ??
      null
    )
  }, [all, id])

  const related = useMemo(
    () => (c ? nebulae.filter((n) => n.conId === c.id) : []),
    [c, nebulae],
  )

  if (!all) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="flex items-center gap-3 text-[#a0a0b8]">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">Loading catalogue…</span>
        </div>
      </div>
    )
  }

  if (!c) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-[#f0f0f8]">No constellation matches “{id}”.</p>
        <Link to="/constellations" className="text-[#9b8cff] hover:text-[#c084fc] text-sm">
          Browse all 88 →
        </Link>
      </div>
    )
  }

  const named = c.stars.filter((s) => s.n)

  return (
    <div className="relative">
      <div className="section-padding container-wide pt-24 pb-16">
        <Link
          to="/constellations"
          className="inline-flex items-center gap-2 text-[13px] text-[#a0a0b8] hover:text-[#f0f0f8] transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" /> All constellations
        </Link>

        <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
          <div>
            <p className="text-[11px] font-medium tracking-[0.28em] uppercase text-[#9b8cff]/90 mb-2">
              {c.id} · {c.genitive}
            </p>
            <h1 className="text-[2.2rem] md:text-[3rem] font-semibold tracking-[-0.02em] text-[#f0f0f8]">
              {c.name}
            </h1>
          </div>

          <div className="inline-flex rounded-full border border-white/10 bg-white/[0.03] p-1">
            <ModeButton active={mode === 'pattern'} onClick={() => setMode('pattern')} icon={<Layers className="w-3.5 h-3.5" />}>
              Sky pattern
            </ModeButton>
            <ModeButton active={mode === 'true3d'} onClick={() => setMode('true3d')} icon={<Orbit className="w-3.5 h-3.5" />}>
              True 3D
            </ModeButton>
          </div>
        </div>

        {related.length > 0 && (
          <div className="grid lg:grid-cols-[1.15fr_1fr] gap-4 mb-4">
            <Link
              to={`/nebulae/${related[0].slug}`}
              className="group relative rounded-2xl overflow-hidden border border-white/[0.07] bg-black"
            >
              <img
                src={assetUrl(related[0].image)}
                alt={related[0].name}
                className="w-full h-full object-cover aspect-[16/10] group-hover:scale-[1.03] transition-transform duration-[900ms]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#05050a] via-transparent to-transparent" />
              <div className="absolute left-4 bottom-4 right-4">
                <p className="text-[11px] uppercase tracking-[0.2em] text-[#9b8cff] mb-1">
                  {related[0].catalog}
                </p>
                <h2 className="text-[1.3rem] font-semibold text-[#f0f0f8]">{related[0].name}</h2>
                <p className="text-[12px] text-[#a0a0b8] mt-0.5">
                  {related[0].type} · {related[0].distanceLy.toLocaleString()} ly · {related[0].credit}
                </p>
              </div>
            </Link>

            <div className="rounded-2xl overflow-hidden border border-white/[0.07] bg-black">
              <ConstellationModel
                constellation={c}
                mode={mode}
                spin={spin}
                onInteract={() => setSpin(false)}
                className="h-full min-h-[300px]"
              />
            </div>
          </div>
        )}

        <div className={`rounded-2xl overflow-hidden border border-white/[0.07] bg-black mb-3 ${related.length > 0 ? 'hidden' : ''}`}>
          <ConstellationModel
            constellation={c}
            mode={mode}
            spin={spin}
            onInteract={() => setSpin(false)}
            className="h-[58vh] min-h-[380px]"
          />
        </div>
        <p className="text-[12px] text-[#6b6b85] mb-10">
          {mode === 'pattern'
            ? 'Every star projected onto one shell — the figure as it looks from Earth. Drag to orbit, scroll to zoom, hover a star for its data.'
            : 'Each star placed at its catalogued distance (log-compressed). The familiar shape only exists from our line of sight.'}
        </p>

        <div className="grid md:grid-cols-4 gap-4 mb-10">
          <Stat label="Stars to mag 6.5" value={c.starCount.toLocaleString()} />
          <Stat label="Named stars" value={String(named.length)} />
          <Stat label="Nearest star" value={formatLy(c.nearestLy)} />
          <Stat label="Farthest star" value={formatLy(c.farthestLy)} />
        </div>

        {named.length > 0 && (
          <>
            <h2 className="text-[1.25rem] font-semibold text-[#f0f0f8] mb-4">Named stars</h2>
            <div className="overflow-x-auto rounded-xl border border-white/[0.07] mb-12">
              <table className="w-full text-[13px] min-w-[620px]">
                <thead>
                  <tr className="text-[11px] uppercase tracking-wider text-[#6b6b85] border-b border-white/[0.07]">
                    <Th>Name</Th>
                    <Th>Designation</Th>
                    <Th right>Magnitude</Th>
                    <Th right>Distance</Th>
                    <Th>Spectral type</Th>
                  </tr>
                </thead>
                <tbody>
                  {named.map((s, i) => (
                    <tr key={`${s.hip ?? s.n}-${i}`} className="border-b border-white/[0.04] last:border-0">
                      <td className="px-4 py-2.5 text-[#f0f0f8]">{s.n}</td>
                      <td className="px-4 py-2.5 text-[#a0a0b8] font-mono text-[12px]">
                        {designation(s, c.genitive) ?? '—'}
                      </td>
                      <td className="px-4 py-2.5 text-[#dcdcec] text-right font-mono text-[12px]">{s.mag}</td>
                      <td className="px-4 py-2.5 text-[#dcdcec] text-right font-mono text-[12px]">
                        {s.ly ? `${Math.round(s.ly).toLocaleString()} ly` : '—'}
                      </td>
                      <td className="px-4 py-2.5 text-[#a0a0b8] font-mono text-[12px]">{s.sp ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {related.length > 0 && (
          <>
            <h2 className="text-[1.25rem] font-semibold text-[#f0f0f8] mb-4">
              Deep-sky objects in {c.name}
            </h2>
            <div className="grid sm:grid-cols-2 gap-4 mb-10">
              {related.map((n) => (
                <Link
                  key={n.slug}
                  to={`/nebulae/${n.slug}`}
                  className="group rounded-xl overflow-hidden border border-white/[0.07] hover:border-[#7c6aff]/40 transition-colors"
                >
                  <div className="aspect-[16/9] overflow-hidden bg-black">
                    <img
                      src={`${import.meta.env.BASE_URL}${n.image}`}
                      alt={n.name}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-700"
                    />
                  </div>
                  <div className="p-4">
                    <h3 className="text-[14px] font-semibold text-[#f0f0f8]">{n.name}</h3>
                    <p className="text-[12px] text-[#a0a0b8] mt-0.5">
                      {n.catalog} · {n.type}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}

        <p className="text-[11px] text-[#6b6b85]">
          Star data: HYG database (Hipparcos / Yale Bright Star Catalog / Gliese). Figure: IAU via
          d3-celestial. Distances are parallax-derived and carry real uncertainty, especially beyond
          a few hundred light-years.
        </p>
      </div>
    </div>
  )
}

function ModeButton({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12px] transition-colors ${
        active ? 'bg-[#7c6aff] text-white' : 'text-[#a0a0b8] hover:text-[#f0f0f8]'
      }`}
    >
      {icon}
      {children}
    </button>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
      <p className="text-[11px] uppercase tracking-wider text-[#6b6b85] mb-1.5">{label}</p>
      <p className="text-[#f0f0f8] text-[17px] font-medium">{value}</p>
    </div>
  )
}

function Th({ children, right }: { children: React.ReactNode; right?: boolean }) {
  return <th className={`px-4 py-2.5 font-medium ${right ? 'text-right' : 'text-left'}`}>{children}</th>
}
