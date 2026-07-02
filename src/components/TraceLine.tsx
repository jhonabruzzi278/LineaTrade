export function TraceLine() {
  // Errática a la izquierda, se estabiliza a la derecha — la disciplina medida, no prometida.
  const points = [
    [0, 60], [20, 30], [40, 85], [60, 20], [80, 70], [100, 35],
    [120, 55], [140, 48], [160, 52], [180, 50], [200, 51], [220, 50],
    [240, 50.5], [260, 50], [280, 50], [300, 50],
  ]
  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0]},${p[1]}`).join(' ')

  return (
    <svg
      viewBox="0 0 300 100"
      className="w-full h-auto"
      preserveAspectRatio="none"
      role="img"
      aria-label="Traza de comportamiento que pasa de errática a estable"
    >
      <line x1="0" y1="50" x2="300" y2="50" stroke="#232935" strokeWidth="0.5" strokeDasharray="2,3" />
      <path
        d={path}
        fill="none"
        stroke="#E3A94A"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength="1"
        style={{
          strokeDasharray: 1,
          strokeDashoffset: 1,
          animation: 'trace-draw 2.4s ease-out forwards',
        }}
      />
      <circle cx="300" cy="50" r="3" fill="#E3A94A" opacity="0">
        <animate attributeName="opacity" begin="2.2s" dur="0.4s" to="1" fill="freeze" />
      </circle>
    </svg>
  )
}
