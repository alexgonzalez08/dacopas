// Replica la lógica de calculate_match_points en JS para testear localmente

function calcPoints(predHome, predAway, resultHome, resultAway) {
  const actualWinner =
    resultHome > resultAway ? 'home' :
    resultAway > resultHome ? 'away' : 'draw'

  const predWinner =
    predHome > predAway ? 'home' :
    predAway > predHome ? 'away' : 'draw'

  const exact = predHome === resultHome && predAway === resultAway

  const pts =
    exact ? 3 :
    predWinner === actualWinner ? 1 : 0

  return { pts, exact: exact ? 1 : 0, winner_only: (!exact && predWinner === actualWinner) ? 1 : 0 }
}

const cases = [
  // Descripción,             pred,  result, pts esperados
  ['Marcador exacto (ganador)',  [2,1], [2,1], 3],
  ['Marcador exacto (empate)',   [1,1], [1,1], 3],
  ['Marcador exacto (0-0)',      [0,0], [0,0], 3],
  ['Ganador correcto',           [1,0], [2,1], 1],
  ['Empate no exacto',           [1,1], [2,2], 1],
  ['Empate no exacto (0-0→1-1)', [0,0], [1,1], 1],
  ['Ganador incorrecto',         [0,1], [2,1], 0],
  ['Empate pred, gana equipo',   [1,1], [2,1], 0],
  ['Ganador pred, hay empate',   [2,1], [1,1], 0],
]

let passed = 0
let failed = 0

for (const [desc, [ph, pa], [rh, ra], expected] of cases) {
  const { pts } = calcPoints(ph, pa, rh, ra)
  const ok = pts === expected
  const icon = ok ? '✅' : '❌'
  console.log(`${icon} ${desc}: ${ph}-${pa} vs ${rh}-${ra} → ${pts} pts (esperado ${expected})`)
  ok ? passed++ : failed++
}

console.log(`\n${passed}/${passed + failed} tests pasaron`)
if (failed > 0) process.exit(1)
