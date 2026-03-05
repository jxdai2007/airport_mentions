import React, { useState, useRef, useCallback, useEffect, useMemo, forwardRef, useImperativeHandle } from 'react'
import airports from './data/airports.curated.json'
import AirportPreviewPanel from './AirportPreviewPanel'
import './MentionTextarea.css'

const MAX_SUGGESTIONS = 20
const RECENT_KEY = 'vaya-recent-airports'
const MAX_RECENT = 5
const airportByIata = new Map(airports.map(a => [a.iata, a]))

function getRecentAirports() {
  try {
    const stored = localStorage.getItem(RECENT_KEY)
    if (!stored) return []
    return JSON.parse(stored)
      .map(code => airportByIata.get(code))
      .filter(Boolean)
  } catch { return [] }
}

function saveRecentAirport(iata) {
  try {
    const stored = localStorage.getItem(RECENT_KEY)
    let codes = stored ? JSON.parse(stored) : []
    codes = codes.filter(c => c !== iata)
    codes.unshift(iata)
    codes = codes.slice(0, MAX_RECENT)
    localStorage.setItem(RECENT_KEY, JSON.stringify(codes))
  } catch { /* ignore */ }
}

function highlightMatch(text, query) {
  if (!query) return text
  const lower = text.toLowerCase()
  const idx = lower.indexOf(query.toLowerCase())
  if (idx === -1) return text
  return (
    <>
      {text.slice(0, idx)}
      <mark className="mention-match">{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  )
}

function getMentionQuery(text, caretPos) {
  const before = text.slice(0, caretPos)
  const atIndex = before.lastIndexOf('@')
  if (atIndex === -1) return null

  if (atIndex > 0) {
    const charBefore = before[atIndex - 1]
    if (!/[\s\n\r,.;:!?()[\]{}]/.test(charBefore)) return null
  }

  const afterAt = text.slice(atIndex)
  if (MENTION_RE_ANCHOR.test(afterAt)) return null

  const query = before.slice(atIndex + 1)
  if (/[\n\r]/.test(query)) return null
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
  return `@✈ ${airport.iata} — ${airport.name} (${airport.city}, ${airport.country})`
}

const MENTION_PATTERN = String.raw`@✈ [A-Z]{3} — [\p{L}\s.''/\u2019-]+\([\p{L}\s,.''/\u2019-]+\)`
const MENTION_RE_ANCHOR = new RegExp('^' + MENTION_PATTERN, 'u')

const MentionTextarea = forwardRef(function MentionTextarea(props, ref) {
  const [value, setValue] = useState('')
  const [mentionState, setMentionState] = useState(null)
  const [highlightIndex, setHighlightIndex] = useState(0)
  const [recents, setRecents] = useState(() => getRecentAirports())
  const [flashIndex, setFlashIndex] = useState(null)
  const textareaRef = useRef(null)
  const mirrorRef = useRef(null)
  const dropdownRef = useRef(null)
  const flashTimerRef = useRef(null)

  const mentionQuery = mentionState?.query ?? null
  const suggestions = useMemo(() => mentionQuery !== null ? filterAirports(mentionQuery) : [], [mentionQuery])

  const showRecents = !!(mentionState && mentionQuery !== null && mentionQuery.length <= 2)
  const filteredRecents = useMemo(() => {
    if (!showRecents) return []
    const suggestionIatas = new Set(suggestions.map(s => s.iata))
    return recents.filter(r => !suggestionIatas.has(r.iata))
  }, [showRecents, recents, suggestions])
  const combinedList = useMemo(() => [...filteredRecents, ...suggestions], [filteredRecents, suggestions])

  const isOpen = mentionState !== null && combinedList.length > 0
  const showNoMatches = mentionState !== null && mentionState.query.length > 0 && combinedList.length === 0
  const highlightedAirport = isOpen ? combinedList[highlightIndex] ?? null : null

  const updateMentionState = useCallback((text, caretPos) => {
    const result = getMentionQuery(text, caretPos)
    setMentionState(result)
    if (result) {
      setHighlightIndex(0)
    }
  }, [])

  const syncFromDOM = useCallback(() => {
    const ta = textareaRef.current
    if (!ta) return
    setValue(ta.value)
    updateMentionState(ta.value, ta.selectionStart)
  }, [updateMentionState])

  const handleKeyUp = useCallback((e) => {
    if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) {
      updateMentionState(e.target.value, e.target.selectionStart)
    }
  }, [updateMentionState])

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

    ta.focus()
    ta.setSelectionRange(atIndex, caretPos)
    document.execCommand('insertText', false, mention)
    saveRecentAirport(airport.iata)
    setRecents(prev => [airport, ...prev.filter(r => r.iata !== airport.iata)].slice(0, MAX_RECENT))
    setFlashIndex(atIndex)
    clearTimeout(flashTimerRef.current)
    flashTimerRef.current = setTimeout(() => setFlashIndex(null), 240)
    setMentionState(null)
  }, [mentionState])

  const handleKeyDown = useCallback((e) => {
    if (!mentionState || combinedList.length === 0) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlightIndex(i => (i + 1) % combinedList.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightIndex(i => (i - 1 + combinedList.length) % combinedList.length)
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault()
      insertMention(combinedList[highlightIndex])
    } else if (e.key === 'Escape') {
      e.preventDefault()
      setMentionState(null)
    }
  }, [mentionState, combinedList, highlightIndex, insertMention])

  useEffect(() => {
    if (!dropdownRef.current) return
    const items = dropdownRef.current.querySelectorAll('.mention-item')
    if (items[highlightIndex]) {
      items[highlightIndex].scrollIntoView({ block: 'nearest' })
    }
  }, [highlightIndex])

  const highlightedText = useMemo(() => {
    if (!value) return '\n'
    const parts = []
    let lastIndex = 0
    let match
    const re = new RegExp(MENTION_PATTERN, 'gu')
    while ((match = re.exec(value)) !== null) {
      if (match.index > lastIndex) {
        parts.push(value.slice(lastIndex, match.index))
      }
      parts.push(<span key={match.index} className={`mention-pill${match.index === flashIndex ? ' mention-pill-flash' : ''}`}>{match[0]}</span>)
      lastIndex = re.lastIndex
    }
    parts.push(value.slice(lastIndex))
    parts.push('\n')
    return parts
  }, [value, flashIndex])

  const handleScroll = useCallback(() => {
    if (mirrorRef.current && textareaRef.current) {
      mirrorRef.current.scrollTop = textareaRef.current.scrollTop
    }
  }, [])

  useImperativeHandle(ref, () => ({
    insertText(text) {
      const ta = textareaRef.current
      if (!ta) return
      ta.focus()
      document.execCommand('insertText', false, text)
    }
  }))

  return (
    <div className="mention-container">
      <div className="mention-wrapper">
        <div className="mention-mirror" ref={mirrorRef} aria-hidden="true">
          {highlightedText}
        </div>
        <textarea
          ref={textareaRef}
          className="mention-textarea"
          defaultValue=""
          onInput={syncFromDOM}
          onKeyDown={handleKeyDown}
          onKeyUp={handleKeyUp}
          onClick={handleClick}
          onScroll={handleScroll}
          placeholder="Start typing... use @ to mention an airport"
        />
      </div>
      {isOpen && (
        <div className="mention-dropdown-wrapper">
          <div className="mention-dropdown" ref={dropdownRef}>
            {filteredRecents.length > 0 && (
              <div className="mention-section-header">Recent</div>
            )}
            {combinedList.map((airport, idx) => (
              <React.Fragment key={idx < filteredRecents.length ? `recent-${airport.iata}` : airport.iata}>
                {idx === filteredRecents.length && filteredRecents.length > 0 && suggestions.length > 0 && (
                  <div className="mention-section-header">Results</div>
                )}
                <div
                  className={`mention-item${idx === highlightIndex ? ' highlighted' : ''}`}
                  onMouseDown={(e) => {
                    e.preventDefault()
                    insertMention(airport)
                  }}
                  onMouseEnter={() => setHighlightIndex(idx)}
                >
                  <div className="mention-item-row">
                    <div className="mention-item-info">
                      <span className="mention-item-name">{highlightMatch(airport.name, mentionQuery)}</span>
                      <span className="mention-item-detail">
                        {highlightMatch(airport.city, mentionQuery)}, {airport.country}
                      </span>
                    </div>
                    <span className="mention-iata-badge">{airport.iata}</span>
                  </div>
                </div>
              </React.Fragment>
            ))}
          </div>
          <AirportPreviewPanel airport={highlightedAirport} />
        </div>
      )}
      {showNoMatches && (
        <div className="mention-dropdown-wrapper">
          <div className="mention-dropdown">
            <div className="mention-no-matches">
              <div className="mention-no-matches-icon" aria-hidden="true">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="7" />
                  <line x1="16.5" y1="16.5" x2="21" y2="21" />
                  <line x1="8" y1="11" x2="14" y2="11" />
                </svg>
              </div>
              <div className="mention-no-matches-title">No airports found</div>
              <div className="mention-no-matches-subtitle">
                Try a different city name or IATA code
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
})

export default MentionTextarea
