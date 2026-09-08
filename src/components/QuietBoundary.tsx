import { Component, type ReactNode } from 'react'

/**
 * Swallows render errors from decorative subtrees.
 *
 * The nebula field is background art. When one of its textures 404'd the
 * throw escaped Suspense and took the whole landing page down with it —
 * a missing decoration must never cost the user the content.
 */
export class QuietBoundary extends Component<
  { children: ReactNode; fallback?: ReactNode },
  { failed: boolean }
> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error: unknown) {
    console.warn('Decorative subtree failed; continuing without it.', error)
  }

  render() {
    if (this.state.failed) return this.props.fallback ?? null
    return this.props.children
  }
}
