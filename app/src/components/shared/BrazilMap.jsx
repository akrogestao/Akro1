import { useState, useEffect, memo } from 'react'
import { ComposableMap, Geographies, Geography, Marker } from 'react-simple-maps'

const GEO_URL = 'https://raw.githubusercontent.com/codeforamerica/click_that_hood/master/public/data/brazil-states.geojson'

const BrazilMap = memo(function BrazilMap({ events = [] }) {
  const [tooltip, setTooltip] = useState(null)

  const activeStates = new Set(events.map(e => e.state).filter(Boolean))

  const cityPins = Object.values(
    events
      .filter(e => e.lat != null && e.lng != null && e.city)
      .reduce((acc, e) => {
        if (!acc[e.city]) acc[e.city] = { city: e.city, state: e.state, lat: e.lat, lng: e.lng, count: 0 }
        acc[e.city].count++
        return acc
      }, {})
  )

  return (
    <div className="relative w-full h-full flex items-center justify-center select-none">
      <ComposableMap
        projection="geoMercator"
        projectionConfig={{ scale: 680, center: [-53, -14] }}
        style={{ width: '100%', height: '100%', background: '#0f172a' }}
      >
        <Geographies geography={GEO_URL}>
          {({ geographies }) =>
            geographies.map(geo => {
              const sigla = geo.properties.sigla || geo.properties.UF_05 || geo.properties.SIGLA
              const active = activeStates.has(sigla)
              return (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  style={{
                    default: {
                      fill: active ? 'hsl(25 85% 38%)' : 'hsl(220 13% 20%)',
                      stroke: 'hsl(220 13% 28%)',
                      strokeWidth: 0.6,
                      outline: 'none',
                    },
                    hover: {
                      fill: active ? 'hsl(25 90% 48%)' : 'hsl(220 13% 25%)',
                      stroke: 'hsl(220 13% 32%)',
                      strokeWidth: 0.6,
                      outline: 'none',
                    },
                    pressed: { outline: 'none' },
                  }}
                />
              )
            })
          }
        </Geographies>

        {cityPins.map(pin => (
          <Marker
            key={pin.city}
            coordinates={[pin.lng, pin.lat]}
            onMouseEnter={() => setTooltip(pin)}
            onMouseLeave={() => setTooltip(null)}
          >
            <circle r={4} fill="hsl(25 90% 55%)" stroke="hsl(25 60% 30%)" strokeWidth={1.2} />
            <circle r={8} fill="hsl(25 90% 55%)" opacity={0.2} />
          </Marker>
        ))}
      </ComposableMap>

      {tooltip && (
        <div className="absolute top-3 left-3 bg-slate-900/90 text-white text-xs px-2.5 py-1.5 rounded-lg pointer-events-none border border-slate-700">
          <span className="font-semibold">{tooltip.city}</span>
          <span className="text-slate-400 ml-1">({tooltip.state})</span>
        </div>
      )}
    </div>
  )
})

export default BrazilMap
