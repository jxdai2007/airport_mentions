import MentionTextarea from './MentionTextarea'
import './App.css'

function App() {
  return (
    <div className="app">
      <h1>Airport Mentions</h1>
      <p>Type <code>@</code> to mention an airport. Try <code>@la</code> or <code>@jfk</code>.</p>
      <MentionTextarea />
    </div>
  )
}

export default App
