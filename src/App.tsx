import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Landing from './pages/Landing'
import { ProtectedRoute } from './components/ProtectedRoute'
import { SuperAdminRoute } from './components/SuperAdminRoute'
import { PwaUpdatePrompt } from './components/PwaUpdatePrompt'
import { NotificationPermissionPrompt } from './components/NotificationPermissionPrompt'
import { AuraBackground } from './components/AuraBackground'
import { SidebarProvider } from './lib/sidebar'

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
const Herramientas = lazy(() => import('./pages/Herramientas'))
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
      <SidebarProvider>
        <AuraBackground />
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
          <Route path="/ia-trader" element={<IaTrader />} />
          <Route path="/eliminar-cuenta" element={<EliminarCuenta />} />
          <Route
            path="/onboarding"
            element={
              <ProtectedRoute>
                <Onboarding />
              </ProtectedRoute>
            }
          />
          <Route
            path="/nuevo-trade"
            element={
              <ProtectedRoute>
                <NuevoTrade />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/historial"
            element={
              <ProtectedRoute>
                <Historial />
              </ProtectedRoute>
            }
          />
          <Route
            path="/trades/:id"
            element={
              <ProtectedRoute>
                <TradeDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/configuracion/ia"
            element={
              <ProtectedRoute>
                <ConfiguracionIA />
              </ProtectedRoute>
            }
          />
          <Route
            path="/sistema"
            element={
              <ProtectedRoute>
                <Sistema />
              </ProtectedRoute>
            }
          />
          <Route
            path="/perfil"
            element={
              <ProtectedRoute>
                <Perfil />
              </ProtectedRoute>
            }
          />
          <Route
            path="/noticias"
            element={
              <ProtectedRoute>
                <Noticias />
              </ProtectedRoute>
            }
          />
          <Route
            path="/noticias/:id"
            element={
              <ProtectedRoute>
                <NoticiaDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/coach"
            element={
              <ProtectedRoute>
                <Coach />
              </ProtectedRoute>
            }
          />
          <Route
            path="/reporte"
            element={
              <ProtectedRoute>
                <Reporte />
              </ProtectedRoute>
            }
          />
          <Route
            path="/herramientas"
            element={
              <ProtectedRoute>
                <Herramientas />
              </ProtectedRoute>
            }
          />
          <Route
            path="/insights"
            element={
              <ProtectedRoute>
                <Insights />
              </ProtectedRoute>
            }
          />
          <Route
            path="/academia"
            element={
              <ProtectedRoute>
                <Academia />
              </ProtectedRoute>
            }
          />
          <Route
            path="/academia/lecciones/:lessonId"
            element={
              <ProtectedRoute>
                <AcademyLesson />
              </ProtectedRoute>
            }
          />
          <Route
            path="/planes"
            element={
              <ProtectedRoute>
                <Planes />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <SuperAdminRoute>
                  <AdminPanel />
                </SuperAdminRoute>
              </ProtectedRoute>
            }
          />
        </Routes>
        </Suspense>
      </SidebarProvider>
    </BrowserRouter>
  )
}
