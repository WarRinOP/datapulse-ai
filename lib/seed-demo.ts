// Demo sales dataset — 200 rows with intentional patterns for showcase
// Patterns:
//   March dip: revenue drops 25% in March
//   West region: consistently 30% lower than North/South/East
//   Product B: returns spike to 15% in Q3 (Jul-Sep) vs 3% baseline
//   Q4 recovery: strong Nov/Dec

export function generateDemoCSV(): string {
  const rows: string[] = ['date,region,product,units_sold,revenue,returns']

  const regions = ['North', 'South', 'East', 'West']
  const products = ['Product A', 'Product B', 'Product C']

  // monthly base revenue per unit
  const basePrice: Record<string, number> = {
    'Product A': 120,
    'Product B': 145,
    'Product C': 98,
  }

  // monthly seasonality multipliers (Jan–Dec)
  const seasonality = [0.82, 0.85, 0.75, 0.90, 0.95, 1.00, 1.03, 1.05, 0.98, 1.10, 1.25, 1.35]

  const months = [
    '2024-01','2024-02','2024-03','2024-04','2024-05','2024-06',
    '2024-07','2024-08','2024-09','2024-10','2024-11','2024-12',
  ]

  months.forEach((month, mIdx) => {
    const season = seasonality[mIdx]
    const isQ3 = mIdx >= 6 && mIdx <= 8  // Jul–Sep

    regions.forEach((region) => {
      const regionFactor = region === 'West' ? 0.70 : 1.0

      products.forEach((product) => {
        // Base units 10–30, modified by season + region
        const baseUnits = Math.round((15 + Math.random() * 15) * season * regionFactor)
        const units = Math.max(3, baseUnits)

        // Revenue = units × price × small random variance
        const variance = 0.92 + Math.random() * 0.16
        const revenue = Math.round(units * basePrice[product] * variance)

        // Returns: Product B spikes in Q3
        const baseReturnRate = 0.03
        const returnRate = (product === 'Product B' && isQ3)
          ? 0.15 + Math.random() * 0.05
          : baseReturnRate + Math.random() * 0.02
        const returns = Math.min(units, Math.round(units * returnRate))

        rows.push(`${month},${region},${product},${units},${revenue},${returns}`)
      })
    })
  })

  return rows.join('\n')
}
