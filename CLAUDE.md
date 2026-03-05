# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — Start Vite dev server (http://localhost:5173)
- `npm run build` — Production build to `dist/`
- `npm run lint` — ESLint (flat config, JS/JSX)
- `npm run preview` — Preview production build
- `npm run generate-airports` — Re-fetch OpenFlights data and regenerate `src/data/airports.json` and `src/data/airports.curated.json`

## Architecture

Single-page React 19 app (Vite 7, JSX, no TypeScript) with a custom @mention autocomplete for airports. Branded as "vaya".

**Key files:**
- `src/MentionTextarea.jsx` — Core mention logic: query parsing (`getMentionQuery`), airport filtering/ranking (`filterAirports`), keyboard navigation, suggestion dropdown with recent airports, and a mirror overlay for pill-styled mentions. Uses `document.execCommand('insertText')` for undo-compatible text replacement.
- `src/AirportPreviewPanel.jsx` — Side panel shown alongside the dropdown displaying airport details and a mini world map with location marker.
- `src/IntroOverlay.jsx` — Lottie-animated splash screen shown once per session (tracked via `sessionStorage`).
- `src/App.jsx` — Wrapper that renders the intro overlay, header with interactive chip buttons, and `MentionTextarea`.

**Data pipeline:**
- `scripts/generate-airports.js` fetches raw CSV from OpenFlights, parses/deduplicates by IATA, computes quality scores, and writes two files:
  - `src/data/airports.json` — Full dataset (~6000 entries)
  - `src/data/airports.curated.json` — Filtered to score >= 50 (~5700 entries, used by the app)
- Scoring: +50 valid IATA, +10 ICAO, +20 "International", +40 major hub, +5-15 country bonus, -30 military/heliport/etc.

**Mention format:** `@✈ LAX — Los Angeles International Airport (Los Angeles, United States)` — matched by a Unicode regex pattern (`MENTION_PATTERN` constant). This exact format is critical for the mirror overlay pill highlighting and mention detection.

**Mention flow:** On every input/click/caret move, `getMentionQuery()` scans backwards from the caret for a valid `@` trigger (must be at start or after whitespace/punctuation). The query filters airports by name, city, country, IATA, or ICAO. Results are sorted: exact IATA match > IATA starts-with > name/city starts-with > score > alphabetical. Selecting a suggestion replaces `@query` with the formatted mention.

**State:** Recent airports stored in `localStorage` (`vaya-recent-airports`), intro seen flag in `sessionStorage` (`vaya-intro-seen`).

## Lint

ESLint flat config (`eslint.config.js`) with `react-hooks` and `react-refresh` plugins. The `no-unused-vars` rule ignores variables starting with uppercase or `_`.
