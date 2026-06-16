import { NavLink, useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { useAuthStore, useThemeStore } from '@/store'
import {
  LayoutDashboard, ShoppingBag, Package, Users, Map, BarChart2,
  Moon, Sun, LogOut, Menu, X, Droplets, ChevronRight
} from 'lucide-react'
import { useState } from 'react'

const NAV = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', color: 'text-blue-400' },
  { to: '/pedidos', icon: ShoppingBag, label: 'Pedidos', color: 'text-emerald-400' },
  { to: '/productos', icon: Package, label: 'Productos', color: 'text-orange-400' },
  { to: '/usuarios', icon: Users, label: 'Usuarios', color: 'text-purple-400' },
  { to: '/rutas', icon: Map, label: 'Rutas del día', color: 'text-cyan-400' },
  { to: '/reportes', icon: BarChart2, label: 'Reportes', color: 'text-pink-400' },
]

export const AppLayout = ({ children }) => {
  const { usuario, logout } = useAuthStore()
  const { dark, toggle } = useThemeStore()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  const handleLogout = () => { logout(); navigate('/login') }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-[#0a0f1e]">
      {/* Mobile overlay */}
      {open && (
        <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={cn(
        'fixed inset-y-0 left-0 z-50 flex w-[240px] flex-col transition-transform duration-300',
        'lg:static lg:translate-x-0',
        open ? 'translate-x-0' : '-translate-x-full',
        'dark:bg-[#080d1a] bg-[#1a2744]',
      )}>

        {/* Decorative top accent */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-blue-500 via-cyan-400 to-blue-600" />
        {/*logo */}
        <div className="relative flex flex-col items-center px-5 py-6">
          <img src="/src/assets/JPSLichtLOGO.png" alt="JPS Licht" className="h-40 w-40 object-contain drop-shadow-lg" />
          <div className="mt-3 text-center">
            {/* <p className="text-base font-bold text-white leading-none tracking-wide">JPS Licht</p> */}
            {/* <p className="text-[10px] text-blue-400/70 mt-1 uppercase tracking-widest">Admin Panel</p> */}
          </div>
          <button className="absolute top-4 right-4 lg:hidden p-1 rounded-lg text-slate-400 hover:text-white
    hover:bg-white/10 transition-colors" onClick={() => setOpen(false)}>
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Divider */}
        <div className="mx-5 mb-4 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

        {/* Nav label */}
        <p className="px-5 mb-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-400">
          Navegación
        </p>

        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto px-3 space-y-0.5">
          {NAV.map(({ to, icon: Icon, label, color }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              onClick={() => setOpen(false)}
              className={({ isActive }) => cn(
                'group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
                isActive
                  ? 'bg-gradient-to-r from-blue-500/25 to-blue-400/15 text-white border border-blue-400/30'
                  : 'text-slate-300 hover:text-white hover:bg-white/8'
              )}
            >
              {({ isActive }) => (
                <>
                  {/* Active left indicator */}
                  {isActive && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-full bg-blue-400" />
                  )}
                  <div className={cn(
                    'flex h-7 w-7 items-center justify-center rounded-lg transition-all duration-200',
                    isActive
                      ? 'bg-blue-500/20'
                      : 'bg-white/5 group-hover:bg-white/10'
                  )}>
                    <Icon className={cn('h-3.5 w-3.5', isActive ? 'text-blue-400' : color, 'opacity-80')} />
                  </div>
                  <span className="flex-1 text-[13px]">{label}</span>
                  {isActive && (
                    <ChevronRight className="h-3 w-3 text-blue-400/60" />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Bottom section */}
        <div className="mt-4">
          <div className="mx-5 mb-3 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

          <div className="px-3 space-y-0.5 pb-3">
            <button
              onClick={toggle}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm
                text-slate-400 hover:text-white hover:bg-white/5 transition-all duration-200"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/5">
                {dark
                  ? <Sun className="h-3.5 w-3.5 text-amber-400" />
                  : <Moon className="h-3.5 w-3.5 text-slate-400" />}
              </div>
              <span className="text-[13px]">{dark ? 'Modo claro' : 'Modo oscuro'}</span>
            </button>

            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm
                text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/5">
                <LogOut className="h-3.5 w-3.5" />
              </div>
              <span className="text-[13px]">Cerrar sesión</span>
            </button>
          </div>

          {/* User card */}
          <div className="mx-3 mb-3 p-3 rounded-xl bg-gradient-to-r from-blue-600/10 to-cyan-600/10
            border border-blue-500/15">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500
                flex items-center justify-center shadow-sm shadow-blue-500/30 shrink-0">
                <span className="text-xs font-bold text-white">
                  {usuario?.nombre?.[0]}{usuario?.apellido?.[0]}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-white truncate">
                  {usuario?.nombre} {usuario?.apellido}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <p className="text-[10px] text-emerald-400 capitalize font-medium">{usuario?.rol}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile topbar */}
        <header className="flex items-center gap-4 border-b border-border bg-card px-4 py-3 lg:hidden">
          <button onClick={() => setOpen(true)}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors">
            <Menu className="h-5 w-5 text-muted-foreground" />
          </button>
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg overflow-hidden bg-white flex items-center justify-center">
              <img src="/src/assets/JPSLichtLOGO.png" alt="JPS Licht" className="h-8 w-8 object-contain" />
            </div>
            <span className="text-sm font-bold">JPS Licht</span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6 animate-fade-in">
          {children}
        </main>
      </div>
    </div>
  )
}