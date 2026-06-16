import { create } from 'zustand'

const stored = () => {
  try { return JSON.parse(localStorage.getItem('usuario')) } catch { return null }
}

export const useAuthStore = create((set) => ({
  token:   localStorage.getItem('token') || null,
  usuario: stored(),

  login: (token, usuario) => {
    localStorage.setItem('token', token)
    localStorage.setItem('usuario', JSON.stringify(usuario))
    set({ token, usuario })
  },

  logout: () => {
    localStorage.removeItem('token')
    localStorage.removeItem('usuario')
    set({ token: null, usuario: null })
  },
}))

// ── Theme store ──────────────────────────────────────────────
const initDark = () => {
  const saved = localStorage.getItem('theme')
  if (saved) return saved === 'dark'
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

export const useThemeStore = create((set) => ({
  dark: initDark(),
  toggle: () => set((s) => {
    const next = !s.dark
    localStorage.setItem('theme', next ? 'dark' : 'light')
    document.documentElement.classList.toggle('dark', next)
    return { dark: next }
  }),
}))
