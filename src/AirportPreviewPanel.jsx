import worldMapUrl from './assets/Simplified_World_Map.svg'
import './AirportPreviewPanel.css'

function formatCoords(lat, lon) {
  const latDir = lat >= 0 ? 'N' : 'S'
  const lonDir = lon >= 0 ? 'E' : 'W'
  return `${Math.abs(lat).toFixed(4)}\u00B0 ${latDir}, ${Math.abs(lon).toFixed(4)}\u00B0 ${lonDir}`
}

export default function AirportPreviewPanel({ airport }) {
  if (!airport) return null

  // Calibrated to Simplified_World_Map.svg (viewBox 0 0 1016.371 514.609)
  // Derived from SVG landmark coordinates (Cape Town, Sri Lanka, etc.)
  const svgX = 2.798 * (airport.lon + 180) + 4.6 - 11
  const svgY = 2.744 * (90 - airport.lat) + 16.0 + 32
  const x = Math.min(1, Math.max(0, svgX / 1016.371))
  const y = Math.min(1, Math.max(0, svgY / 514.609))

  return (
    <div className="preview-panel" key={airport.iata}>
      {/* Header */}
      <div className="preview-header">
        <span className="preview-airplane-icon" aria-hidden="true">{'\u2708'}</span>
        <span className="preview-iata-badge">{airport.iata}</span>
      </div>

      {/* Name */}
      <h3 className="preview-name">{airport.name}</h3>

      {/* Meta */}
      <div className="preview-meta">
        <span>{airport.city}, {airport.country}</span>
        {airport.icao && (
          <span>
            <span className="preview-meta-label">ICAO</span>
            {airport.icao}
          </span>
        )}
        <span>
          <span className="preview-meta-label">Coords</span>
          {formatCoords(airport.lat, airport.lon)}
        </span>
      </div>

      {/* Mini Map */}
      <div className="preview-map">
        <img
          className="preview-map-svg"
          src={worldMapUrl}
          alt=""
          aria-hidden="true"
          draggable={false}
        />
        <div
          className="preview-map-marker"
          style={{ left: `${x * 100}%`, top: `${y * 100}%` }}
        />
        <span className="preview-map-label">Approx. location</span>
      </div>
    </div>
  )
}
