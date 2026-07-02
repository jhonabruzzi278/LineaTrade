import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Landing from './pages/Landing'
import Signup from './pages/Signup'
import Login from './pages/Login'
import Recuperar from './pages/Recuperar'
import ActualizarPassword from './pages/ActualizarPassword'
import Onboarding from './pages/Onboarding'
import NuevoTrade from './pages/NuevoTrade'
import { ProtectedRoute } from './components/ProtectedRoute'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/registro" element={<Signup />} />
        <Route path="/login" element={<Login />} />
        <Route path="/recuperar" element={<Recuperar />} />
        <Route path="/actualizar-password" element={<ActualizarPassword />} />
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
      </Routes>
    </BrowserRouter>
  )
}
