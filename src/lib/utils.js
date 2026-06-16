import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export const cn = (...inputs) => twMerge(clsx(inputs))

export const formatCurrency = (amount) =>
  new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD' }).format(amount ?? 0)

export const formatDate = (date) =>
  date ? new Intl.DateTimeFormat('es-EC', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(date)) : '—'

export const formatDateOnly = (date) =>
  date ? new Intl.DateTimeFormat('es-EC', { dateStyle: 'medium' }).format(new Date(date)) : '—'

export const ESTADO_PEDIDO = {
  pendiente:  { label: 'Pendiente',  color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400' },
  confirmado: { label: 'Confirmado', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' },
  en_ruta:    { label: 'En ruta',    color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400' },
  entregado:  { label: 'Entregado',  color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' },
  cancelado:  { label: 'Cancelado',  color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' },
}
