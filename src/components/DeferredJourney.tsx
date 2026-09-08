import { Suspense, lazy, useEffect, useState } from 'react'

const NebulaJourney = lazy(() =>
  import('./NebulaField').then((m) => ({ default: m.NebulaJourney })),
)

/**
 * Holds the WebGL field back until the browser has actually painted.
 *
 * Measured: the home DOM was interactive at ~490ms but first contentful
 * paint did not land until ~3.5s, while canvas-free routes painted in under
 * 100ms. Creating the context and compiling shaders was starving the first
 * paint. requestIdleCallback was not enough — the browser reports idle
 * before it has painted — so this waits on the paint entry itself and only
 * then loads Three.js.
 */
export function DeferredJourney() {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let done = false
    let observer: PerformanceObserver | undefined

    const go = () => {
      if (done) return
      done = true
      setReady(true)
    }

    // A short breath after paint so the compositor settles before we take
    // the main thread for context creation.
    const afterPaint = () => setTimeout(go, 250)

    try {
      const painted = performance
        .getEntriesByType('paint')
        .some((e) => e.name === 'first-contentful-paint')

      if (painted) {
        afterPaint()
      } else {
        observer = new PerformanceObserver((list) => {
          if (list.getEntries().some((e) => e.name === 'first-contentful-paint')) afterPaint()
        })
        observer.observe({ type: 'paint', buffered: true })
      }
    } catch {
      setTimeout(go, 600)
    }

    // Never strand the visual if paint timing is unavailable.
    const fallback = setTimeout(go, 2500)

    return () => {
      done = true
      observer?.disconnect()
      clearTimeout(fallback)
    }
  }, [])

  if (!ready) return null

  return (
    <Suspense fallback={null}>
      <NebulaJourney />
    </Suspense>
  )
}
