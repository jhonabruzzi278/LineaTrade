export function TraceLine() {
  // Errática a la izquierda, se estabiliza a la derecha — la disciplina medida, no prometida.
  const points = [
    [0, 60], [20, 30], [40, 85], [60, 20], [80, 70], [100, 35],
    [120, 55], [140, 48], [160, 52], [180, 50], [200, 51], [220, 50],
    [240, 50.5], [260, 50], [280, 50], [300, 50],
  ]
  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0]},${p[1]}`).join(' ')
  // Área bajo la traza: mismo camino, cerrado contra la base para el relleno degradado.
  const areaPath = `${linePath} L300,100 L0,100 Z`
  // Rejilla vertical tenue — da sensación de ejes/datos, no de dibujo decorativo.
  const gridX = [60, 120, 180, 240]

  return (
    <svg
      viewBox="0 0 300 100"
      className="w-full h-auto"
      preserveAspectRatio="none"
      role="img"
      aria-label="Traza de comportamiento que pasa de errática a estable"
    >
      <defs>
        <linearGradient id="trace-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#C99C54" stopOpacity="0.16" />
          <stop offset="100%" stopColor="#C99C54" stopOpacity="0" />
        </linearGradient>
      </defs>

      {gridX.map((x) => (
        <line key={x} x1={x} y1="6" x2={x} y2="94" stroke="#232935" strokeWidth="0.5" />
      ))}
      <line x1="0" y1="50" x2="300" y2="50" stroke="#232935" strokeWidth="0.5" strokeDasharray="2,3" />

      <path
        d={areaPath}
        fill="url(#trace-fill)"
        stroke="none"
        style={{ opacity: 0, animation: 'reveal 1s ease-out 1.4s forwards' }}
      />
      <path
        d={linePath}
        fill="none"
        stroke="#C99C54"
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
      <circle cx="300" cy="50" r="3" fill="#C99C54" opacity="0">
        <animate attributeName="opacity" begin="2.2s" dur="0.4s" to="1" fill="freeze" />
      </circle>
      <circle cx="300" cy="50" r="6" fill="none" stroke="#C99C54" strokeWidth="0.75" opacity="0">
        <animate attributeName="opacity" begin="2.4s" dur="0.6s" to="0.4" fill="freeze" />
      </circle>
    </svg>
  )
}
