import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Sun, Moon } from 'lucide-react'
import { authApi } from '@/services/api'
import { useAuthStore, useThemeStore } from '@/store'
import logo from '@/assets/JPSLichtLOGO.png'


export default function LoginPage() {
  const navigate = useNavigate()
  const { login } = useAuthStore()
  const { dark, toggle } = useThemeStore()
  const [form, setForm]       = useState({ email: '', password: '' })
  const [show, setShow]       = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { data } = await authApi.login(form)
      login(data.data.token, data.data.usuario)
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.message || 'Credenciales incorrectas')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-950 p-4">

      {/* Toggle modo oscuro — esquina superior derecha, estilo Material */}
      <div className="fixed top-4 right-4 z-50">
        <button
          onClick={toggle}
          title={dark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
          className="relative flex items-center gap-2 px-3 py-2 rounded-full shadow-md text-xs font-medium transition-all duration-300 select-none"
          style={{
            background: dark
              ? 'linear-gradient(135deg, #1e3a5f 0%, #1a2a4a 100%)'
              : 'linear-gradient(135deg, #bfe3fd 0%, #93d1fb 100%)',
            color: dark ? '#93d1fb' : '#1e4488',
            boxShadow: dark
              ? '0 2px 12px rgba(59,151,242,0.25)'
              : '0 2px 12px rgba(59,151,242,0.20)',
          }}
        >
          {/* Track switch */}
          <span
            className="relative inline-flex items-center w-10 h-5 rounded-full transition-all duration-300"
            style={{ background: dark ? '#3b97f2' : '#bfe3fd', border: '1.5px solid', borderColor: dark ? '#60b7f7' : '#93d1fb' }}
          >
            <span
              className="absolute h-4 w-4 rounded-full shadow transition-all duration-300 flex items-center justify-center"
              style={{
                left: dark ? 'calc(100% - 18px)' : '2px',
                background: dark ? '#fff' : '#3b97f2',
              }}
            >
              {dark
                ? <Moon  style={{ width: 9, height: 9, color: '#3b97f2' }} />
                : <Sun   style={{ width: 9, height: 9, color: '#fff' }} />
              }
            </span>
          </span>
          <span>{dark ? 'Modo oscuro' : 'Modo claro'}</span>
        </button>
      </div>

      {/* Card principal */}
      <div
        className="w-full max-w-3xl rounded-2xl shadow-xl overflow-hidden flex animate-fade-in"
        style={{ minHeight: 420 }}
      >
        {/* Panel izquierdo — logo */}
        <div
          className="hidden sm:flex w-5/12 flex-col items-center justify-center p-10 gap-6"
          style={{ background: 'linear-gradient(160deg, #dbeffe 0%, #bfe3fd 50%, #93d1fb 100%)' }}
        >
          <img
            src={logo}
            alt="JPS Licht"
            className="w-full max-w-[220px] object-contain drop-shadow-xl"
          />
          <p className="text-blue-700 text-sm text-center font-medium tracking-wide">
        
          </p>
        </div>

        {/* Panel derecho — formulario */}
        <div className="flex-1 bg-white dark:bg-gray-900 flex flex-col justify-center px-10 py-12 relative">

          {/* Logo mobile */}
          <div className="flex justify-center mb-6 sm:hidden">
            <img
              src={logo} alt="JPS Licht"
              className="h-20 object-contain rounded-xl p-2"
              style={{ background: 'linear-gradient(160deg, #dbeffe, #93d1fb)' }}
            />
          </div>

          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">Bienvenido</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">
            Ingresa tus credenciales para acceder al sistema
          </p>

          <form onSubmit={submit} className="space-y-5">
            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Correo electrónico
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 4H4a2 2 0 00-2 2v12a2 2 0 002 2h16a2 2 0 002-2V6a2 2 0 00-2-2z"/>
                    <polyline points="22,6 12,13 2,6"/>
                  </svg>
                </span>
                <input
                  type="email"
                  placeholder="ejemplo@correo.com"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  required
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                />
              </div>
            </div>

            {/* Contraseña */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Contraseña
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="11" width="18" height="11" rx="2"/>
                    <path d="M7 11V7a5 5 0 0110 0v4"/>
                  </svg>
                </span>
                <input
                  type={show ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  required
                  className="w-full pl-10 pr-10 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                />
                <button
                  type="button"
                  onClick={() => setShow(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white text-sm font-semibold transition-colors shadow-sm"
            >
              {loading ? 'Ingresando...' : 'Ingresar al sistema'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}