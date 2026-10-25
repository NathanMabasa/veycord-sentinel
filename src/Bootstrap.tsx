import { Component, useEffect, useRef, useState } from 'react'
import type { ComponentType, ReactNode } from 'react'

function StartupScreen({ failed = false }: { failed?: boolean }) {
  return <div className="startup-screen" role={failed ? 'alert' : 'status'} aria-label={failed ? 'Application unavailable' : 'Loading Veycord Sentinel'}>
    <div className="startup-content">
      <div className="startup-brand" aria-hidden="true"><span className="startup-mark"><i /><i /></span><span><b>veycord</b><small>sentinel</small></span></div>
      <p>{failed ? 'The application could not load.' : 'Loading Veycord Sentinel…'}</p>
      {failed ? <><span className="startup-help">Check your connection, then try again.</span><button type="button" onClick={() => window.location.reload()}>Reload application</button></> : <span className="startup-indicator" aria-hidden="true"><i /></span>}
    </div>
  </div>
}

class ApplicationBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  render() { return this.state.failed ? <StartupScreen failed /> : this.props.children }
}

export default function Bootstrap() {
  const [Application, setApplication] = useState<ComponentType | null>(null)
  const [failed, setFailed] = useState(false)
  const [visible, setVisible] = useState(true)
  const splash = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let active = true
    void import('./App').then(module => {
      if (active) setApplication(() => module.default)
    }).catch(() => { if (active) setFailed(true) })
    return () => { active = false }
  }, [])

  useEffect(() => {
    if (!Application) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setVisible(false)
      return
    }
    let active = true
    let tween: { kill: () => void } | undefined
    // Readiness must not depend indefinitely on an animation frame or animation import.
    const handoverDeadline = window.setTimeout(() => { if (active) setVisible(false) }, 1200)
    // The app module is ready. Animate only its handover; no artificial loading delay.
    void import('gsap').then(({ gsap }) => {
      if (!active || !splash.current) return
      tween = gsap.to(splash.current, { opacity: 0, duration: 0.28, ease: 'power2.out', onComplete: () => { if (active) setVisible(false) } })
    }).catch(() => { if (active) setVisible(false) })
    return () => { active = false; window.clearTimeout(handoverDeadline); tween?.kill() }
  }, [Application])

  return <>
    {Application && <div className="application-root" inert={visible} aria-hidden={visible || undefined}><ApplicationBoundary><Application /></ApplicationBoundary></div>}
    {(visible || failed) && <div ref={splash}><StartupScreen failed={failed} /></div>}
  </>
}
