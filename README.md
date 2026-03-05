# Airport Mentions

A single-page React app with a textarea that supports `@mentions` for airports. No mention libraries used — the mention logic is implemented from scratch.

## Install & Run

```bash
npm install
npm run dev
```

Then open [http://localhost:5173](http://localhost:5173).

## How It Works

### Mention Parsing Logic

1. On every input change, click, or caret movement, the app looks backwards from the current caret position (`selectionStart`) to find the most recent `@` character.
2. The `@` is only valid if it appears at the start of text or is preceded by whitespace/punctuation — this prevents false triggers inside words like `email@example`.
3. The substring between `@` and the caret is the **query**. If it contains a newline, the mention is cancelled.
4. The query is used to filter airports via case-insensitive substring matching against name, city, country, IATA code, and ICAO code.
5. When a suggestion is selected (Enter, Tab, or click), the `@query` text is replaced with the formatted mention (e.g., `@Los Angeles International (LAX)`), a trailing space is added, and the caret is placed after the space.

### Keyboard Navigation

- **ArrowDown / ArrowUp** — move highlight through suggestions
- **Enter / Tab** — select highlighted item
- **Escape** — close suggestions

### Dataset

Airport data sourced from [OpenFlights](https://github.com/jpatokal/openflights) (`airports.dat`), trimmed to 2,000 airports with valid IATA codes. The data is committed as a static JSON file at `src/data/airports.json`.
