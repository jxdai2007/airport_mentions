import { useRef, useState, useCallback } from 'react'
import MentionTextarea from './MentionTextarea'
import IntroOverlay from './IntroOverlay'
import './App.css'

const INTRO_SEEN_KEY = 'vaya-intro-seen'

function App() {
  const textareaRef = useRef(null)
  const [showIntro, setShowIntro] = useState(
    () => !sessionStorage.getItem(INTRO_SEEN_KEY)
  )

  const handleIntroDone = useCallback(() => {
    sessionStorage.setItem(INTRO_SEEN_KEY, '1')
    setShowIntro(false)
    // Focus textarea after overlay unmounts
    requestAnimationFrame(() => {
      textareaRef.current?.focus?.()
    })
  }, [])

  const handleChipClick = (text) => {
    textareaRef.current?.insertText(text)
  }

  return (
    <>
      {showIntro && <IntroOverlay onDone={handleIntroDone} />}
      <div className="bg-blobs" aria-hidden="true">
        <div className="bg-blob bg-blob--1" />
        <div className="bg-blob bg-blob--2" />
        <div className="bg-blob bg-blob--3" />
      </div>
      <div className="app">
      <header className="app-header">
        <div className="app-brand">
          <span className="app-wordmark">vaya</span>
          <span className="app-badge">MVP</span>
        </div>
        <h1 className="app-title">Airport Mentions</h1>
        <p className="app-subtitle">
          Type <button className="chip chip-interactive" onClick={() => handleChipClick('@')}>@</button> to mention an airport. Try searching by name, city, or IATA code.
        </p>
        <div className="app-chips">
          <button className="chip chip-interactive" onClick={() => handleChipClick('@la')}>@la</button>
          <button className="chip chip-interactive" onClick={() => handleChipClick('@jfk')}>@jfk</button>
          <button className="chip chip-interactive" onClick={() => handleChipClick('@tokyo')}>@tokyo</button>
        </div>
      </header>
      <MentionTextarea ref={textareaRef} />
    </div>
    </>
  )
}

export default App
