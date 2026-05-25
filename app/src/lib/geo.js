const R = 6371

function toRad(deg) { return deg * Math.PI / 180 }

export function haversine(lat1, lng1, lat2, lng2) {
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export function routeDistance(events) {
  const pts = events
    .filter(e => e.lat != null && e.lng != null)
    .sort((a, b) => a.date.localeCompare(b.date))
  let total = 0
  for (let i = 1; i < pts.length; i++) {
    total += haversine(pts[i - 1].lat, pts[i - 1].lng, pts[i].lat, pts[i].lng)
  }
  return Math.round(total)
}

export function fmtKm(km) {
  if (km >= 1000) return `${(km / 1000).toFixed(1).replace('.', ',')} mil km`
  return `${km} km`
}
