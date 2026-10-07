import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Routes, Route } from 'react-router-dom'
import Landing from './pages/Landing'
import { ProtectedRoute } from './components/ProtectedRoute'
import { SuperAdminRoute } from './components/SuperAdminRoute'
import { PwaUpdatePrompt } from './components/PwaUpdatePrompt'
import { NotificationPermissionPrompt } from './components/NotificationPermissionPrompt'
import { AppLayout } from './components/shell/AppLayout'
import { AccountLayout } from './components/shell/AccountLayout'

// Cada pantalla se carga bajo demanda. Landing queda en el paquete inicial porque es
// la primera experiencia pública; el producto privado se descarga después del login.
const Enlaces = lazy(() => import('./pages/Enlaces'))
const Signup = lazy(() => import('./pages/Signup'))
const Login = lazy(() => import('./pages/Login'))
const Recuperar = lazy(() => import('./pages/Recuperar'))
const ActualizarPassword = lazy(() => import('./pages/ActualizarPassword'))
const Privacidad = lazy(() => import('./pages/Privacidad'))
const Onboarding = lazy(() => import('./pages/Onboarding'))
const NuevoTrade = lazy(() => import('./pages/NuevoTrade'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Historial = lazy(() => import('./pages/Historial'))
const TradeDetail = lazy(() => import('./pages/TradeDetail'))
const ConfiguracionIA = lazy(() => import('./pages/ConfiguracionIA'))
const AdminPanel = lazy(() => import('./pages/AdminPanel'))
const Sistema = lazy(() => import('./pages/Sistema'))
const Perfil = lazy(() => import('./pages/Perfil'))
const Noticias = lazy(() => import('./pages/Noticias'))
const NoticiaDetail = lazy(() => import('./pages/NoticiaDetail'))
const IaTrader = lazy(() => import('./pages/IaTrader'))
const EliminarCuenta = lazy(() => import('./pages/EliminarCuenta'))
const Coach = lazy(() => import('./pages/Coach'))
const Reporte = lazy(() => import('./pages/Reporte'))
const Mas = lazy(() => import('./pages/Mas'))
const Insights = lazy(() => import('./pages/Insights'))
const Academia = lazy(() => import('./pages/Academia'))
const AcademyLesson = lazy(() => import('./pages/AcademyLesson'))
const Planes = lazy(() => import('./pages/Planes'))

function RouteFallback() {
  return (
    <div className="min-h-screen bg-ink flex items-center justify-center">
      <p className="font-body text-[14px] text-text-muted">Cargando...</p>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
        <PwaUpdatePrompt />
        <NotificationPermissionPrompt />
        <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/enlaces" element={<Enlaces />} />
          <Route path="/registro" element={<Signup />} />
          <Route path="/login" element={<Login />} />
          <Route path="/recuperar" element={<Recuperar />} />
          <Route path="/actualizar-password" element={<ActualizarPassword />} />
          <Route path="/privacidad" element={<Privacidad />} />
          <Route path="/eliminar-cuenta" element={<EliminarCuenta />} />

          {/* Pantallas a pantalla completa (modo foco): sin barra lateral ni inferior. */}
          <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
          <Route path="/nuevo-trade" element={<ProtectedRoute><NuevoTrade /></ProtectedRoute>} />
          <Route path="/coach" element={<ProtectedRoute><Coach /></ProtectedRoute>} />
          <Route path="/noticias/:id" element={<ProtectedRoute><NoticiaDetail /></ProtectedRoute>} />

          {/* Pública, pero con el marco de la app cuando hay sesión. */}
          <Route element={<AppLayout optional />}>
            <Route path="/ia-trader" element={<IaTrader />} />
          </Route>

          {/* App autenticada: barra lateral en escritorio, pestañas en móvil. */}
          <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/historial" element={<Historial />} />
            <Route path="/trades/:id" element={<TradeDetail />} />
            <Route path="/reporte" element={<Reporte />} />
            <Route path="/insights" element={<Insights />} />
            <Route path="/noticias" element={<Noticias />} />
            <Route path="/academia" element={<Academia />} />
            <Route path="/academia/lecciones/:lessonId" element={<AcademyLesson />} />
            <Route path="/mas" element={<Mas />} />
            {/* Cuenta: subnav de 200px en escritorio, "← Más" en móvil. */}
            <Route element={<AccountLayout />}>
              <Route path="/perfil" element={<Perfil />} />
              <Route path="/sistema" element={<Sistema />} />
              <Route path="/configuracion/ia" element={<ConfiguracionIA />} />
              <Route path="/planes" element={<Planes />} />
              <Route path="/admin" element={<SuperAdminRoute><AdminPanel /></SuperAdminRoute>} />
            </Route>
          </Route>

          <Route path="/herramientas" element={<Navigate to="/mas" replace />} />
        </Routes>
        </Suspense>
    </BrowserRouter>
  )
}
