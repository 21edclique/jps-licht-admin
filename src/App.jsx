import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ToastProvider, ToastViewport } from '@/components/ui'
import { AppLayout } from '@/components/layout/AppLayout'
import { useAuthStore, useThemeStore } from '@/store'
import { useEffect } from 'react'

import LoginPage    from '@/pages/LoginPage'
import DashboardPage from '@/pages/DashboardPage'
import PedidosPage  from '@/pages/PedidosPage'
import ProductosPage from '@/pages/ProductosPage'
import UsuariosPage  from '@/pages/UsuariosPage'
import RutasPage     from '@/pages/RutasPage'
import ReportesPage  from '@/pages/ReportesPage'

const qc = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
})

const ProtectedRoute = ({ children }) => {
  const { token } = useAuthStore()
  return token ? children : <Navigate to="/login" replace />
}

export default function App() {
  const { dark } = useThemeStore()

  // Aplicar clase dark al montar
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
  }, [dark])

  return (
    <QueryClientProvider client={qc}>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/*" element={
              <ProtectedRoute>
                <AppLayout>
                  <Routes>
                    <Route path="/"         element={<DashboardPage />} />
                    <Route path="/pedidos"  element={<PedidosPage />} />
                    <Route path="/productos" element={<ProductosPage />} />
                    <Route path="/usuarios"  element={<UsuariosPage />} />
                    <Route path="/rutas"     element={<RutasPage />} />
                    <Route path="/reportes"  element={<ReportesPage />} />
                    <Route path="*"          element={<Navigate to="/" replace />} />
                  </Routes>
                </AppLayout>
              </ProtectedRoute>
            } />
          </Routes>
        </BrowserRouter>
        <ToastViewport />
      </ToastProvider>
    </QueryClientProvider>
  )
}
