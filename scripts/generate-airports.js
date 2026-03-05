/* global process */
/**
 * Fetches the full OpenFlights airport dataset and generates scored JSON files
 * for the airport mention autocomplete.
 *
 * Usage: node scripts/generate-airports.js
 */

import { writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_DIR = resolve(__dirname, '..', 'src', 'data')

const OPENFLIGHTS_URL =
  'https://raw.githubusercontent.com/jpatokal/openflights/master/data/airports.dat'

// --- Scoring constants ---

const MAJOR_HUBS = new Set([
  'ATL', 'PEK', 'DXB', 'LAX', 'HND', 'ORD', 'LHR', 'CDG', 'DFW', 'CAN',
  'AMS', 'FRA', 'IST', 'SIN', 'ICN', 'DEN', 'DEL', 'NRT', 'JFK', 'SFO',
  'SEA', 'MIA', 'FCO', 'SYD', 'BKK', 'MEX', 'KUL', 'MUC', 'MAD', 'BCN',
  'EWR', 'HKG', 'PVG', 'SHA', 'CTU', 'BOS', 'TPE', 'DOH', 'ZRH', 'VIE',
  'YYZ', 'LGA', 'MSP', 'DTW', 'PHX', 'IAH', 'CLT', 'MCO', 'SVO', 'DME',
])

const COUNTRY_BONUS = {
  'United States': 10, 'China': 10, 'United Kingdom': 10, 'Japan': 10,
  'Germany': 8, 'France': 8, 'Australia': 8, 'India': 8, 'Brazil': 5,
  'Canada': 8, 'South Korea': 8, 'Thailand': 5, 'Singapore': 8,
  'United Arab Emirates': 8, 'Spain': 5, 'Italy': 5, 'Netherlands': 5,
  'Turkey': 5, 'Mexico': 5, 'Indonesia': 5,
}

const DEPRIOR_RE =
  /Heliport|Air Base|Aerodrome|Air Force|Military|AFB|Air Station|Flying Field|Seaplane|Gliderport|Naval|Army|Airstrip|RAF /i

// --- CSV parsing ---

function parseCSVLine(line) {
  const fields = []
  let i = 0
  while (i < line.length) {
    if (line[i] === '"') {
      i++ // skip opening quote
      let val = ''
      while (i < line.length) {
        if (line[i] === '"' && line[i + 1] === '"') {
          val += '"'
          i += 2
        } else if (line[i] === '"') {
          i++ // skip closing quote
          break
        } else {
          val += line[i]
          i++
        }
      }
      fields.push(val)
      if (line[i] === ',') i++ // skip comma after quoted field
    } else {
      let val = ''
      while (i < line.length && line[i] !== ',') {
        val += line[i]
        i++
      }
      fields.push(val)
      if (line[i] === ',') i++
    }
  }
  return fields
}

function nullify(val) {
  return (!val || val === '\\N' || val === 'N/A') ? '' : val.trim()
}

// --- Scoring ---

function computeScore(airport) {
  let score = 0

  if (/^[A-Z]{3}$/.test(airport.iata)) score += 50
  if (/^[A-Z]{4}$/.test(airport.icao)) score += 10
  if (/International/i.test(airport.name)) score += 20
  if (MAJOR_HUBS.has(airport.iata)) score += 40
  if (DEPRIOR_RE.test(airport.name)) score -= 30
  score += (COUNTRY_BONUS[airport.country] || 0)

  return score
}

// --- Main ---

async function main() {
  console.log('Fetching OpenFlights airport data...')
  const res = await fetch(OPENFLIGHTS_URL)
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`)
  const text = await res.text()

  const lines = text.split('\n').filter(l => l.trim())
  console.log(`Parsed ${lines.length} raw lines`)

  // Parse and filter
  const byIata = new Map()

  for (const line of lines) {
    const f = parseCSVLine(line)
    // Fields: 0=ID, 1=Name, 2=City, 3=Country, 4=IATA, 5=ICAO, 6=Lat, 7=Lon,
    //         8=Alt, 9=TZ, 10=DST, 11=TzOlson, 12=Type, 13=Source
    const iata = nullify(f[4])
    if (!/^[A-Z]{3}$/.test(iata)) continue // skip entries without valid IATA

    const type = nullify(f[12])
    if (type === 'closed') continue

    const airport = {
      name: nullify(f[1]) || 'Unknown',
      city: nullify(f[2]) || '',
      country: nullify(f[3]) || '',
      iata,
      icao: nullify(f[5]) || '',
      lat: parseFloat(f[6]) || 0,
      lon: parseFloat(f[7]) || 0,
    }

    // Deduplicate by IATA — keep entry with ICAO, or first occurrence
    if (!byIata.has(iata) || (!byIata.get(iata).icao && airport.icao)) {
      byIata.set(iata, airport)
    }
  }

  // Score all airports
  const airports = [...byIata.values()].map(a => ({
    ...a,
    score: computeScore(a),
  }))

  // Sort: score desc, then name asc
  airports.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))

  // Write full dataset
  const fullPath = resolve(DATA_DIR, 'airports.json')
  writeFileSync(fullPath, JSON.stringify(airports, null, 0))
  console.log(`Wrote ${airports.length} airports to airports.json`)

  // Curated: score >= 50 (at minimum has valid IATA and isn't heavily de-prioritized)
  const curated = airports.filter(a => a.score >= 50)
  const curatedPath = resolve(DATA_DIR, 'airports.curated.json')
  writeFileSync(curatedPath, JSON.stringify(curated, null, 0))
  console.log(`Wrote ${curated.length} airports to airports.curated.json`)

  // Sanity check
  const top10 = curated.slice(0, 10).map(a => `${a.iata} (${a.score})`).join(', ')
  console.log(`Top 10: ${top10}`)
}

main().catch(err => {
  console.error('Error:', err.message)
  process.exit(1)
})
