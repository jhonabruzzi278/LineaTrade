import { Link } from 'react-router-dom'
import { Nav } from '../components/Nav'

const sections = [
  {
    title: '1. Qué datos recolectamos',
    body: 'Cuando creas una cuenta y usás LineaTrade recolectamos: datos de tu cuenta (correo electrónico, contraseña cifrada); datos de perfil que completás en el onboarding; y los datos de tus operaciones de trading que registrás vos mismo (instrumento, precio, tamaño, stop loss, contexto, notas de psicología y aprendizaje, y las capturas de pantalla que subís a un trade). No recolectamos datos de mercado ni ejecutamos operaciones — todo lo que ves en tu bitácora lo ingresaste vos.',
  },
  {
    title: '2. Cómo usamos tus datos',
    body: 'Tus datos se usan exclusivamente para mostrarte tu propia bitácora, calcular tus métricas (win rate, profit factor, expectancy) y, si lo activás, para que un modelo de IA interprete patrones de tu propio historial. La IA nunca inventa cifras: solo interpreta datos que ya calculamos nosotros a partir de tu bitácora. Si configurás tu propia clave de proveedor de IA (BYOK), esa clave se guarda cifrada y nunca se expone en texto plano.',
  },
  {
    title: '3. Con quién compartimos datos',
    body: 'No vendemos ni compartimos tus datos con terceros con fines comerciales. Usamos Supabase (Estados Unidos/UE, según región del proyecto) como proveedor de base de datos, autenticación y almacenamiento de archivos — actúa como encargado del tratamiento de datos bajo nuestras instrucciones. Si activás análisis con IA, el contenido estructurado de un trade se envía al proveedor de modelo que elijas (por ejemplo, Groq, OpenAI, Anthropic, Google) únicamente para generar ese análisis puntual.',
  },
  {
    title: '4. Seguridad',
    body: 'Todas las tablas de la base de datos tienen seguridad a nivel de fila (RLS): ningún usuario puede leer o modificar los datos de otro. Las imágenes de trades se guardan en un bucket privado y solo se acceden mediante URLs firmadas de duración limitada. El acceso de administración a datos agregados del sistema no expone operaciones individuales de ningún usuario.',
  },
  {
    title: '5. Tus derechos',
    body: 'Podés solicitar la exportación o eliminación completa de tu cuenta y todos los datos asociados en cualquier momento escribiendo a soporte. Eliminar tu cuenta borra tu perfil, tus trades, tus imágenes y tu historial de forma permanente.',
  },
  {
    title: '6. Contacto',
    body: 'Para consultas sobre privacidad o para ejercer tus derechos sobre tus datos, escribinos a soporte@lineartrade.app.',
  },
]

export default function Privacidad() {
  return (
    <div className="min-h-screen bg-ink">
      <Nav />
      <main className="max-w-3xl mx-auto px-6 pt-20 pb-24">
        <p className="font-mono text-[13px] text-signal tracking-wide mb-4">legal</p>
        <h1 className="font-display text-[32px] md:text-[40px] text-text-primary mb-3">
          Política de privacidad
        </h1>
        <p className="font-body text-[14px] text-text-faint mb-12">
          Última actualización: julio de 2026
        </p>

        <div className="space-y-10">
          {sections.map((section) => (
            <div key={section.title}>
              <h2 className="font-display text-[18px] text-text-primary mb-3">
                {section.title}
              </h2>
              <p className="font-body text-[15px] text-text-muted leading-relaxed">
                {section.body}
              </p>
            </div>
          ))}
        </div>

        <p className="font-body text-[14px] text-text-muted mt-16 pt-8 border-t border-hairline">
          <Link to="/" className="text-signal hover:text-signal-dim transition-colors">
            Volver al inicio
          </Link>
        </p>
      </main>
    </div>
  )
}
