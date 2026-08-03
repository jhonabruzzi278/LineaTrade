import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Landing from './pages/Landing'
import Signup from './pages/Signup'
import Login from './pages/Login'
import Recuperar from './pages/Recuperar'
import ActualizarPassword from './pages/ActualizarPassword'
import Privacidad from './pages/Privacidad'
import Onboarding from './pages/Onboarding'
import NuevoTrade from './pages/NuevoTrade'
import Dashboard from './pages/Dashboard'
import Historial from './pages/Historial'
import TradeDetail from './pages/TradeDetail'
import ConfiguracionIA from './pages/ConfiguracionIA'
import AdminPanel from './pages/AdminPanel'
import Sistema from './pages/Sistema'
import Perfil from './pages/Perfil'
import Noticias from './pages/Noticias'
import NoticiaDetail from './pages/NoticiaDetail'
import IaTrader from './pages/IaTrader'
import EliminarCuenta from './pages/EliminarCuenta'
import Scanner from './pages/Scanner'
import Coach from './pages/Coach'
import { ProtectedRoute } from './components/ProtectedRoute'
import { SuperAdminRoute } from './components/SuperAdminRoute'
import { PwaUpdatePrompt } from './components/PwaUpdatePrompt'
import { NotificationPermissionPrompt } from './components/NotificationPermissionPrompt'
import { AuraBackground } from './components/AuraBackground'

// lightweight-charts (~solo esta ruta la usa) es la dependencia más pesada del
// bundle — code-split para no cargarla en las otras ~20 rutas que nunca la tocan.
// Ver CLAUDE.md "Backtesting (Market Replay)".
const Backtesting = lazy(() => import('./pages/Backtesting'))

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
      <AuraBackground />
      <PwaUpdatePrompt />
      <NotificationPermissionPrompt />
      <Routes>
        <Route path="/" element={<Landing />} />
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
          path="/backtesting"
          element={
            <ProtectedRoute>
              <Suspense fallback={<RouteFallback />}>
                <Backtesting />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="/escaner"
          element={
            <ProtectedRoute>
              <Scanner />
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
    </BrowserRouter>
  )
}
