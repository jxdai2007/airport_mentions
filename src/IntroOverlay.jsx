import { useEffect, useRef, useState, useCallback } from 'react'
import Lottie from 'lottie-react'
import travelAnimation from './assets/Travel.json'

const MAX_DURATION = 2000

export default function IntroOverlay({ onDone }) {
  const [hiding, setHiding] = useState(false)
  const timerRef = useRef(null)
  const dismissedRef = useRef(false)

  const dismiss = useCallback(() => {
    if (dismissedRef.current) return
    dismissedRef.current = true
    clearTimeout(timerRef.current)
    setHiding(true)
  }, [])

  useEffect(() => {
    timerRef.current = setTimeout(dismiss, MAX_DURATION)

    const handleKey = (e) => {
      if (e.key === 'Escape') dismiss()
    }
    window.addEventListener('keydown', handleKey)

    return () => {
      clearTimeout(timerRef.current)
      window.removeEventListener('keydown', handleKey)
    }
  }, [dismiss])

  const handleTransitionEnd = (e) => {
    if (e.propertyName === 'opacity') {
      onDone()
    }
  }

  return (
    <div
      className={`intro-overlay${hiding ? ' intro-overlay--hiding' : ''}`}
      onClick={dismiss}
      onTransitionEnd={handleTransitionEnd}
      role="dialog"
      aria-label="Vaya intro"
    >
      <div className="intro-overlay__content">
        <div className="intro-overlay__lottie">
          <Lottie animationData={travelAnimation} loop={false} />
        </div>
        <span className="intro-overlay__title">vaya</span>
        <p className="intro-overlay__subtitle">Plan your trip</p>
      </div>
    </div>
  )
}
