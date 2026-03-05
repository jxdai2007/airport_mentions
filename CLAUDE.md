# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — Start Vite dev server (http://localhost:5173)
- `npm run build` — Production build to `dist/`
- `npm run lint` — ESLint (flat config, JS/JSX)
- `npm run preview` — Preview production build

## Architecture

Single-page React 19 app (Vite 7, JSX, no TypeScript) with a custom @mention autocomplete for airports.

**Key files:**
- `src/MentionTextarea.jsx` — All mention logic: query parsing, airport filtering, keyboard navigation, and suggestion dropdown. This is the core of the app.
- `src/App.jsx` — Thin wrapper that renders `MentionTextarea`.
- `src/data/airports.json` — Static dataset of ~2,000 airports with IATA codes (from OpenFlights).

**Mention flow:** On every input/click/caret move, `getMentionQuery()` scans backwards from the caret for a valid `@` trigger (must be at start or after whitespace/punctuation). The query filters airports by name, city, country, IATA, or ICAO. Selecting a suggestion replaces `@query` with `@Airport Name (IATA) `.

## Lint

ESLint flat config (`eslint.config.js`) with `react-hooks` and `react-refresh` plugins. The `no-unused-vars` rule ignores variables starting with uppercase or `_`.
