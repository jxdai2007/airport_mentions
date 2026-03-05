import MentionTextarea from './MentionTextarea'
import './App.css'

function App() {
  return (
    <div className="app">
      <header className="app-header">
        <div className="app-brand">
          <span className="app-wordmark">vaya</span>
          <span className="app-badge">MVP</span>
        </div>
        <h1 className="app-title">Airport Mentions</h1>
        <p className="app-subtitle">
          Type <span className="chip">@</span> to mention an airport. Try searching by name, city, or IATA code.
        </p>
        <div className="app-chips">
          <span className="chip">@la</span>
          <span className="chip">@jfk</span>
          <span className="chip">@tokyo</span>
        </div>
      </header>
      <MentionTextarea />
    </div>
  )
}

export default App
