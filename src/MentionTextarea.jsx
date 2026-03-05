import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import airports from './data/airports.curated.json'
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
  const matches = []

  for (const airport of airports) {
    if (
      airport.name.toLowerCase().includes(lower) ||
      airport.city.toLowerCase().includes(lower) ||
      airport.iata.toLowerCase().includes(lower) ||
      airport.icao.toLowerCase().includes(lower) ||
      airport.country.toLowerCase().includes(lower)
    ) {
      matches.push(airport)
    }
  }

  matches.sort((a, b) => {
    const aExact = a.iata.toLowerCase() === lower ? 1 : 0
    const bExact = b.iata.toLowerCase() === lower ? 1 : 0
    if (aExact !== bExact) return bExact - aExact

    const aIataStart = a.iata.toLowerCase().startsWith(lower) ? 1 : 0
    const bIataStart = b.iata.toLowerCase().startsWith(lower) ? 1 : 0
    if (aIataStart !== bIataStart) return bIataStart - aIataStart

    const aNameStart = (a.name.toLowerCase().startsWith(lower) || a.city.toLowerCase().startsWith(lower)) ? 1 : 0
    const bNameStart = (b.name.toLowerCase().startsWith(lower) || b.city.toLowerCase().startsWith(lower)) ? 1 : 0
    if (aNameStart !== bNameStart) return bNameStart - aNameStart

    if (a.score !== b.score) return b.score - a.score

    return a.name.localeCompare(b.name)
  })

  return matches.slice(0, MAX_SUGGESTIONS)
}

function formatMention(airport) {
  return `@${airport.name} (${airport.iata})`
}

// Matches finalized mentions like @Los Angeles International (LAX)
const MENTION_RE = /@[A-Z][A-Za-z\s.''/\u2019-]+\([A-Z]{3}\)/g

export default function MentionTextarea() {
  const [value, setValue] = useState('')
  const [mentionState, setMentionState] = useState(null) // { query, atIndex }
  const [highlightIndex, setHighlightIndex] = useState(0)
  const textareaRef = useRef(null)
  const mirrorRef = useRef(null)
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
    const caretPos = e.target.selectionStart
    setValue(newValue)
    updateMentionState(newValue, caretPos)
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
    const mention = formatMention(airport) + ' '

    // Use native DOM API so the edit is recorded in the browser undo stack
    ta.focus()
    ta.setRangeText(mention, atIndex, caretPos, 'end')
    // Dispatch input event so React's onChange picks up the new value
    ta.dispatchEvent(new Event('input', { bubbles: true }))
    setMentionState(null)
  }, [mentionState])

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

  const highlightedText = useMemo(() => {
    if (!value) return '\n'
    const parts = []
    let lastIndex = 0
    let match
    const re = new RegExp(MENTION_RE.source, 'g')
    while ((match = re.exec(value)) !== null) {
      if (match.index > lastIndex) {
        parts.push(value.slice(lastIndex, match.index))
      }
      parts.push(<span key={match.index} className="mention-pill">{match[0]}</span>)
      lastIndex = re.lastIndex
    }
    parts.push(value.slice(lastIndex))
    // Trailing newline ensures mirror height matches textarea when last char is \n
    parts.push('\n')
    return parts
  }, [value])

  const handleScroll = useCallback(() => {
    if (mirrorRef.current && textareaRef.current) {
      mirrorRef.current.scrollTop = textareaRef.current.scrollTop
    }
  }, [])

  const isOpen = mentionState !== null && suggestions.length > 0
  const showNoMatches = mentionState !== null && mentionState.query.length > 0 && suggestions.length === 0

  return (
    <div className="mention-container">
      <div className="mention-wrapper">
        <div className="mention-mirror" ref={mirrorRef} aria-hidden="true">
          {highlightedText}
        </div>
        <textarea
          ref={textareaRef}
          className="mention-textarea"
          value={value}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          onKeyUp={handleKeyUp}
          onClick={handleClick}
          onScroll={handleScroll}
          placeholder="Start typing... use @ to mention an airport"
        />
      </div>
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
      {showNoMatches && (
        <div className="mention-dropdown">
          <div className="mention-no-matches">No matching airports found</div>
        </div>
      )}
    </div>
  )
}
