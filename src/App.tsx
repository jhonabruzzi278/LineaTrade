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
import { ProtectedRoute } from './components/ProtectedRoute'
import { SuperAdminRoute } from './components/SuperAdminRoute'
import { PwaUpdatePrompt } from './components/PwaUpdatePrompt'

export default function App() {
  return (
    <BrowserRouter>
      <PwaUpdatePrompt />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/registro" element={<Signup />} />
        <Route path="/login" element={<Login />} />
        <Route path="/recuperar" element={<Recuperar />} />
        <Route path="/actualizar-password" element={<ActualizarPassword />} />
        <Route path="/privacidad" element={<Privacidad />} />
        <Route path="/ia-trader" element={<IaTrader />} />
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
