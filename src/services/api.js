import axios from 'axios'

const api = axios.create({ baseURL: `${import.meta.env.VITE_API_URL}/api` })

// Adjuntar token en cada request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Redirigir al login si el token expiró
api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('usuario')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

// ── Auth ────────────────────────────────────────────────────
export const authApi = {
  login:          (data)  => api.post('/auth/login', { ...data, rol_esperado: 'admin' }), 
  me:             ()      => api.get('/auth/me'),
  updateFcmToken: (token) => api.put('/auth/fcm-token', { fcm_token: token }),
}

// ── Productos ───────────────────────────────────────────────
export const productosApi = {
  listar:             (params)    => api.get('/productos', { params }),
  obtener:            (id)        => api.get(`/productos/${id}`),
  stockBajo:          ()          => api.get('/productos/stock-bajo'),
  crear:              (data)      => api.post('/productos', data),
  actualizar:         (id, data)  => api.put(`/productos/${id}`, data),
  eliminar:           (id)        => api.delete(`/productos/${id}`),
  eliminarDefinitivo: (id)        => api.delete(`/productos/${id}/definitivo`),
  listarDesactivados: ()          => api.get('/productos/desactivados'),
  reactivar:          (id)        => api.put(`/productos/${id}/reactivar`),
}

// ── Pedidos ─────────────────────────────────────────────────
export const pedidosApi = {
  listar:        (params)         => api.get('/pedidos', { params }),
  obtener:       (id)             => api.get(`/pedidos/${id}`),
  cambiarEstado: (id, estado, notas) => api.put(`/pedidos/${id}/estado`, { estado, notas }), // ← fix: notas incluidas
  asignar:       (id, data)       => api.put(`/pedidos/${id}/asignar`, data),
}

// ── Rutas ────────────────────────────────────────────────────
export const rutasApi = {
  listar:           (params) => api.get('/rutas', { params }),
  generar:          (data)   => api.post('/rutas/generar', data),
  actualizarParada: (id, d)  => api.put(`/rutas/paradas/${id}`, d),
}

// ── Usuarios ─────────────────────────────────────────────────
export const usuariosApi = {
  listar:     (params)      => api.get('/usuarios', { params }),
  crear:      (data)        => api.post('/usuarios', data),
  toggle:     (id, activo)  => api.patch(`/usuarios/${id}/activo`, { activo }),
  actualizar: (id, data)    => api.put(`/usuarios/${id}`, data),
  eliminar:   (id)          => api.delete(`/usuarios/${id}`),
}

export default api