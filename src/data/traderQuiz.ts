// "Convierte la IA en tu trader" — test de perfil. Modelo de datos propio,
// deliberadamente distinto del de onboarding.ts: acá el id es un string
// abierto (no una unión literal atada a columnas de `profiles`) porque las
// respuestas no se persisten campo a campo, se guardan como un blob jsonb en
// trader_plans.answers y las interpreta computeTraderPlan() (ver
// lib/traderPlanEngine.ts). La redacción de las preguntas es propia de
// LineaTrade — no es una copia del cuestionario de referencia que inspiró la
// estructura en bloques.

export interface QuizOption {
  value: string
  label: string
}

export interface QuizQuestion {
  id: string
  blockId: string
  title: string
  options: QuizOption[]
}

export interface QuizBlock {
  id: string
  title: string
  subtitle: string
}

export const traderQuizBlocks: QuizBlock[] = [
  { id: 'punto-partida', title: 'Tu punto de partida', subtitle: 'Dos preguntas para ubicarte.' },
  { id: 'tiempo-ritmo', title: 'Tu tiempo y tu ritmo', subtitle: 'Cuánto puedes dedicarle de verdad.' },
  { id: 'dinero', title: 'Tu dinero', subtitle: 'Solo lo que estarías dispuesto a perder.' },
  { id: 'riesgo', title: 'Tú frente al riesgo', subtitle: 'Cómo reaccionas cuando las cosas van mal.' },
  { id: 'mercado', title: 'Tus preferencias de mercado', subtitle: 'Qué te interesa seguir de verdad.' },
]

export const traderQuizQuestions: QuizQuestion[] = [
  // Bloque 1 — punto de partida
  {
    id: 'experience',
    blockId: 'punto-partida',
    title: '¿Has operado a corto plazo antes (comprar y vender en horas o días, no invertir a largo plazo)?',
    options: [
      { value: 'never', label: 'Nunca lo he hecho' },
      { value: 'tried_demo', label: 'Probé en demo o con muy poco dinero' },
      { value: 'under_1y', label: 'Llevo menos de un año operando' },
      { value: 'years', label: 'Llevo varios años operando' },
    ],
  },
  {
    id: 'motivation',
    blockId: 'punto-partida',
    title: '¿Por qué quieres empezar a operar ahora?',
    options: [
      { value: 'curiosity', label: 'Curiosidad, quiero aprender algo nuevo' },
      { value: 'extra_income', label: 'Conseguir un ingreso extra a futuro' },
      { value: 'urgent_need', label: 'Necesito resolver una situación económica pronto' },
      { value: 'freedom', label: 'Construir independencia financiera a largo plazo' },
    ],
  },
  // Bloque 2 — tiempo y ritmo
  {
    id: 'daily_time',
    blockId: 'tiempo-ritmo',
    title: '¿Cuánto tiempo real puedes dedicarle cada día?',
    options: [
      { value: 'minimal', label: 'Casi nada, reviso el móvil un par de veces' },
      { value: 'half_to_1h', label: 'Entre 30 minutos y 1 hora, en ratos sueltos' },
      { value: 'one_to_3h', label: 'De 1 a 3 horas' },
      { value: 'many_hours', label: 'Varias horas frente a la pantalla' },
    ],
  },
  {
    id: 'days_per_week',
    blockId: 'tiempo-ritmo',
    title: '¿Cuántos días a la semana podrías ser constante?',
    options: [
      { value: 'one_two', label: '1 o 2 días' },
      { value: 'three_four', label: '3 o 4 días' },
      { value: 'almost_daily', label: 'Casi todos los días' },
    ],
  },
  {
    id: 'holding_tolerance',
    blockId: 'tiempo-ritmo',
    title: '¿Cómo llevarías tener una operación abierta varios días, con dinero en riesgo incluso el fin de semana?',
    options: [
      { value: 'comfortable', label: 'Bien, entiendo que ganar lleva su tiempo' },
      { value: 'ok_if_winning', label: 'Lo aguanto si va a mi favor' },
      { value: 'slightly_nervous', label: 'Me pondría algo nervioso' },
      { value: 'cannot_do_it', label: 'No podría, necesito cerrar todo cada día' },
    ],
  },
  {
    id: 'end_of_day_pref',
    blockId: 'tiempo-ritmo',
    title: 'Al terminar el día, ¿qué prefieres?',
    options: [
      { value: 'close_everything', label: 'Cerrarlo todo y desconectar' },
      { value: 'let_winners_run', label: 'Dejar correr lo que va bien, aunque tarde días' },
    ],
  },
  // Bloque 3 — dinero
  {
    id: 'starting_capital',
    blockId: 'dinero',
    title: '¿Con cuánto empezarías, contando solo lo que podrías perder por completo sin que te afecte?',
    options: [
      { value: 'under_500', label: 'Menos de 500 €' },
      { value: '500_2000', label: 'Entre 500 € y 2.000 €' },
      { value: '2000_10000', label: 'Entre 2.000 € y 10.000 €' },
      { value: 'over_10000', label: 'Más de 10.000 €' },
    ],
  },
  {
    id: 'capital_source',
    blockId: 'dinero',
    title: 'Ese dinero, ¿de dónde sale?',
    options: [
      { value: 'spare_savings', label: 'Ahorro que no voy a necesitar' },
      { value: 'part_of_savings', label: 'Una parte de mis ahorros' },
      { value: 'needed_soon', label: 'Dinero que voy a necesitar pronto para otra cosa' },
      { value: 'borrowed', label: 'Es prestado o de una tarjeta de crédito' },
    ],
  },
  {
    id: 'income_stability',
    blockId: 'dinero',
    title: 'Fuera del trading, tus ingresos son…',
    options: [
      { value: 'stable', label: 'Estables y predecibles' },
      { value: 'variable_sufficient', label: 'Variables, pero suficientes' },
      { value: 'unstable', label: 'Inestables — dependería de esto' },
    ],
  },
  // Bloque 4 — frente al riesgo
  {
    id: 'loss_reaction',
    blockId: 'riesgo',
    title: 'Haces una operación y pierdes. ¿Qué es lo más probable en ti?',
    options: [
      { value: 'calm', label: 'Lo asumo con calma, es parte del juego' },
      { value: 'annoyed_but_follows_plan', label: 'Me molesta, pero respeto mi plan' },
      { value: 'wants_revenge', label: 'Me entran ganas de recuperarlo ya mismo' },
      { value: 'freezes', label: 'Me bloqueo o me pongo muy nervioso' },
    ],
  },
  {
    id: 'drawdown_reaction',
    blockId: 'riesgo',
    title: 'Si tu cuenta cayera un 20% en una mala racha, ¿cómo lo vivirías?',
    options: [
      { value: 'accept', label: 'Lo asumiría, son cosas que pasan' },
      { value: 'uncomfortable_but_holds', label: 'Incómodo, pero aguantaría' },
      { value: 'cuts_risk_hard', label: 'Reduciría mucho el riesgo' },
      { value: 'would_quit', label: 'No podría, lo dejaría' },
    ],
  },
  {
    id: 'risk_description',
    blockId: 'riesgo',
    title: '¿Cómo te describirían tus allegados frente al dinero y el riesgo?',
    options: [
      { value: 'goes_for_it', label: 'Me la juego' },
      { value: 'calculates_then_acts', label: 'Calculo bien y luego me arriesgo' },
      { value: 'cautious', label: 'Soy cauto' },
      { value: 'avoids_risk', label: 'Evito el riesgo siempre que puedo' },
    ],
  },
  {
    id: 'quick_decisions',
    blockId: 'riesgo',
    title: 'Cuando tienes que tomar una decisión rápida…',
    options: [
      { value: 'decides_and_moves_on', label: 'Decido y sigo adelante sin darle vueltas' },
      { value: 'hesitates_then_decides', label: 'Dudo un momento, pero decido' },
      { value: 'freezes_up', label: 'Tiendo a paralizarme' },
      { value: 'impulsive_then_regrets', label: 'Decido impulsivamente y después me arrepiento' },
    ],
  },
  {
    id: 'patience',
    blockId: 'riesgo',
    title: '¿Cuál de estas frases te describe mejor?',
    options: [
      { value: 'patient', label: 'Soy paciente, puedo esperar la buena oportunidad' },
      { value: 'balanced', label: 'Equilibrado — espero, pero me cuesta' },
      { value: 'needs_action', label: 'Necesito acción, aburrirme me mata' },
    ],
  },
  {
    id: 'thrill_seeking',
    blockId: 'riesgo',
    title: 'Fuera del trading, ¿te atraen las apuestas o las experiencias intensas?',
    options: [
      { value: 'loves_it', label: 'Me encanta la adrenalina' },
      { value: 'likes_it_controlled', label: 'Me gustan, pero las controlo' },
      { value: 'prefers_calm', label: 'Prefiero la seguridad y la calma' },
    ],
  },
  // Bloque 5 — preferencias de mercado
  {
    id: 'volatility_pref',
    blockId: 'mercado',
    title: 'Un activo se mueve poco (1-2% al día), otro se mueve muchísimo (hasta 15% en un día). ¿Cuál te atrae más?',
    options: [
      { value: 'calm', label: 'El tranquilo, prefiero la estabilidad' },
      { value: 'some_movement', label: 'Algo de movimiento, sin locuras' },
      { value: 'volatile', label: 'El que se mueve mucho' },
      { value: 'as_volatile_as_possible', label: 'Cuanto más movimiento, mejor' },
    ],
  },
  {
    id: 'interest',
    blockId: 'mercado',
    title: '¿Qué te resulta más interesante seguir?',
    options: [
      { value: 'companies', label: 'Las empresas y sus resultados' },
      { value: 'macro_economy', label: 'La economía mundial y los bancos centrales' },
      { value: 'technology', label: 'La tecnología y la innovación' },
      { value: 'no_preference', label: 'No tengo una preferencia clara' },
    ],
  },
  {
    id: 'market_pull',
    blockId: 'mercado',
    title: '¿Qué mercado te llama más la atención?',
    options: [
      { value: 'forex', label: 'Divisas / forex' },
      { value: 'indices', label: 'Índices (S&P 500, Nasdaq...)' },
      { value: 'crypto', label: 'Criptomonedas' },
      { value: 'stocks', label: 'Acciones de empresas concretas' },
      { value: 'commodities', label: 'Materias primas (oro, plata, petróleo...)' },
      { value: 'undecided', label: 'No lo sé, que se decida según lo que encaje conmigo' },
    ],
  },
  {
    id: 'monthly_expectation',
    blockId: 'mercado',
    title: '¿Cuánto crees que es realista ganar al mes, con trading bien hecho?',
    options: [
      { value: 'one_to_3', label: 'Entre un 1% y un 3%' },
      { value: 'five_to_10', label: 'Entre un 5% y un 10%' },
      { value: 'twenty_to_50', label: 'Entre un 20% y un 50%' },
      { value: 'over_50', label: 'Más de un 50%' },
      { value: 'no_idea', label: 'No tengo ni idea' },
    ],
  },
]
