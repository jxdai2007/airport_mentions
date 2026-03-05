import { useState, useRef, useCallback, useEffect } from 'react'
import airports from './data/airports.json'
import './MentionTextarea.css'

const MAX_SUGGESTIONS = 20

function getMentionQuery(text, caretPos) {
  // Look backwards from caret for the most recent unescaped @
  const before = text.slice(0, caretPos)

  // Find the last @ in the text before caret
  const atIndex = before.lastIndexOf('@')
  if (atIndex === -1) return null

  // @ must be at start of text or preceded by whitespace/punctuation
  if (atIndex > 0) {
    const charBefore = before[atIndex - 1]
    if (!/[\s\n\r,.;:!?()[\]{}]/.test(charBefore)) return null
  }

  // Extract query: text between @ and caret
  const query = before.slice(atIndex + 1)

  // Cancel if there's a space or newline in the query (mention terminated)
  if (/[\n\r]/.test(query)) return null
  // Allow spaces within the query for multi-word airport names
  // But cancel if the query is too long (likely not a mention)
  if (query.length > 50) return null

  return { query, atIndex }
}

function filterAirports(query) {
  if (!query) return airports.slice(0, MAX_SUGGESTIONS)

  const lower = query.toLowerCase()
  const results = []

  for (const airport of airports) {
    if (results.length >= MAX_SUGGESTIONS) break
    if (
      airport.name.toLowerCase().includes(lower) ||
      airport.city.toLowerCase().includes(lower) ||
      airport.iata.toLowerCase().includes(lower) ||
      airport.icao.toLowerCase().includes(lower) ||
      airport.country.toLowerCase().includes(lower)
    ) {
      results.push(airport)
    }
  }

  return results
}

function formatMention(airport) {
  return `@${airport.name} (${airport.iata})`
}

function formatDisplay(airport) {
  return `${airport.name} — ${airport.iata} — ${airport.city}, ${airport.country}`
}

export default function MentionTextarea() {
  const [value, setValue] = useState('')
  const [mentionState, setMentionState] = useState(null) // { query, atIndex }
  const [highlightIndex, setHighlightIndex] = useState(0)
  const textareaRef = useRef(null)
  const dropdownRef = useRef(null)

  const suggestions = mentionState ? filterAirports(mentionState.query) : []

  const updateMentionState = useCallback((text, caretPos) => {
    const result = getMentionQuery(text, caretPos)
    setMentionState(result)
    if (result) {
      setHighlightIndex(0)
    }
  }, [])

  const handleInput = useCallback((e) => {
    const newValue = e.target.value
    setValue(newValue)
    updateMentionState(newValue, e.target.selectionStart)
  }, [updateMentionState])

  const handleKeyUp = useCallback((e) => {
    // Update mention state on caret movement keys
    if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) {
      updateMentionState(value, e.target.selectionStart)
    }
  }, [value, updateMentionState])

  const handleClick = useCallback(() => {
    const ta = textareaRef.current
    if (ta) {
      updateMentionState(ta.value, ta.selectionStart)
    }
  }, [updateMentionState])

  const insertMention = useCallback((airport) => {
    if (!mentionState) return

    const { atIndex } = mentionState
    const ta = textareaRef.current
    const caretPos = ta.selectionStart
    const mention = formatMention(airport)

    const before = value.slice(0, atIndex)
    const after = value.slice(caretPos)
    const newValue = before + mention + ' ' + after
    const newCaret = before.length + mention.length + 1

    setValue(newValue)
    setMentionState(null)

    // Restore caret position after React re-render
    requestAnimationFrame(() => {
      ta.focus()
      ta.setSelectionRange(newCaret, newCaret)
    })
  }, [mentionState, value])

  const handleKeyDown = useCallback((e) => {
    if (!mentionState || suggestions.length === 0) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlightIndex(i => (i + 1) % suggestions.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightIndex(i => (i - 1 + suggestions.length) % suggestions.length)
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault()
      insertMention(suggestions[highlightIndex])
    } else if (e.key === 'Escape') {
      e.preventDefault()
      setMentionState(null)
    }
  }, [mentionState, suggestions, highlightIndex, insertMention])

  // Scroll highlighted item into view
  useEffect(() => {
    if (!dropdownRef.current) return
    const item = dropdownRef.current.children[highlightIndex]
    if (item) {
      item.scrollIntoView({ block: 'nearest' })
    }
  }, [highlightIndex])

  const isOpen = mentionState !== null && suggestions.length > 0

  return (
    <div className="mention-container">
      <textarea
        ref={textareaRef}
        className="mention-textarea"
        value={value}
        onChange={handleInput}
        onKeyDown={handleKeyDown}
        onKeyUp={handleKeyUp}
        onClick={handleClick}
        placeholder="Start typing... use @ to mention an airport"
        rows={6}
      />
      {isOpen && (
        <div className="mention-dropdown" ref={dropdownRef}>
          {suggestions.map((airport, i) => (
            <div
              key={airport.iata}
              className={`mention-item${i === highlightIndex ? ' highlighted' : ''}`}
              onMouseDown={(e) => {
                e.preventDefault() // Prevent textarea blur
                insertMention(airport)
              }}
              onMouseEnter={() => setHighlightIndex(i)}
            >
              <span className="mention-item-name">{airport.name}</span>
              <span className="mention-item-detail">
                {airport.iata} — {airport.city}, {airport.country}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
