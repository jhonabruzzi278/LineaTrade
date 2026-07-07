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
import { ProtectedRoute } from './components/ProtectedRoute'
import { SuperAdminRoute } from './components/SuperAdminRoute'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/registro" element={<Signup />} />
        <Route path="/login" element={<Login />} />
        <Route path="/recuperar" element={<Recuperar />} />
        <Route path="/actualizar-password" element={<ActualizarPassword />} />
        <Route path="/privacidad" element={<Privacidad />} />
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
