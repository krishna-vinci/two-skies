export function aqiCategory(n: number): { label: string; color: string } {
  if (n <= 50) return { label: 'Good', color: '#4ade80' }
  if (n <= 100) return { label: 'Moderate', color: '#facc15' }
  if (n <= 150) return { label: 'Unhealthy for sensitive groups', color: '#fb923c' }
  if (n <= 200) return { label: 'Unhealthy', color: '#f87171' }
  if (n <= 300) return { label: 'Very unhealthy', color: '#c084fc' }
  return { label: 'Hazardous', color: '#be123c' }
}

export function uvLabel(n: number): string {
  if (n < 3) return 'Low'
  if (n < 6) return 'Moderate'
  if (n < 8) return 'High'
  if (n < 11) return 'Very high'
  return 'Extreme'
}
