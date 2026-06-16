import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { pedidosApi, usuariosApi, rutasApi } from '@/services/api'
import { Card, Button, Select, SelectTrigger, SelectValue, SelectContent, SelectItem, Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, Input, Label } from '@/components/ui'
import { formatCurrency, formatDate, ESTADO_PEDIDO } from '@/lib/utils'
import { Eye, UserCheck, Filter, Navigation, Clock, Truck, Calendar, AlertTriangle, ChevronRight, XCircle } from 'lucide-react'
import { useSocket } from '@/hooks/useSocket'

const ESTADOS = ['todos', 'pendiente', 'confirmado', 'en_ruta', 'entregado', 'cancelado']
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || ''

const MOTIVOS_CANCELACION = [
  'Cliente solicitó cancelación',
  'Producto sin stock',
  'Dirección incorrecta o no encontrada',
  'Cliente no responde',
  'Pedido duplicado',
  'Problema con el método de pago',
  'Otro',
]

// Devuelve true si la fecha de entrega es POSTERIOR a mañana (no hoy ni mañana)
// Es decir: bloqueado si faltan MÁS de 1 día para la entrega
function esFechaFutura(fecha_entrega_est) {
  if (!fecha_entrega_est) return false
  const f    = new Date(fecha_entrega_est)
  const hoy  = new Date().toISOString().slice(0, 10)
  const manana = new Date(Date.now() + 86400000).toISOString().slice(0, 10)
  const fechaStr = f.toISOString().slice(0, 10)
  // Permitir asignar hoy o el día anterior a la entrega
  return fechaStr !== hoy && fechaStr !== manana && f > new Date()
}

function useRutaInfo(pedido, distribuidorUbicaciones) {
  const [info, setInfo] = useState(null)
  useEffect(() => {
    if (pedido?.estado !== 'en_ruta') { setInfo(null); return }
    const dir = pedido.direccion
    const ubic = distribuidorUbicaciones[pedido.distribuidor_id]
    if (!dir || !ubic || !MAPBOX_TOKEN) return
    const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${ubic.lng},${ubic.lat};${dir.longitud},${dir.latitud}?access_token=${MAPBOX_TOKEN}&overview=false`
    fetch(url).then(r => r.json()).then(data => {
      const route = data.routes?.[0]
      if (route) setInfo({ distanciaKm: (route.distance / 1000).toFixed(1), duracionMin: Math.ceil(route.duration / 60) })
    }).catch(() => {})
  }, [pedido?.estado, pedido?.distribuidor_id, distribuidorUbicaciones])
  return info
}

function labelFecha(fechaStr) {
  const hoy = new Date().toISOString().slice(0, 10)
  const ayer = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
  if (fechaStr === hoy) return 'Hoy'
  if (fechaStr === ayer) return 'Ayer'
  return new Intl.DateTimeFormat('es-EC', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(fechaStr + 'T12:00:00'))
}

function TooltipBloqueado({ anchorRef, fechaLabel }) {
  const [pos, setPos] = useState(null)
  useEffect(() => {
    if (!anchorRef.current) return
    const rect = anchorRef.current.getBoundingClientRect()
    setPos({ top: rect.bottom + window.scrollY + 6, left: rect.right + window.scrollX - 208 })
  }, [anchorRef])
  if (!pos) return null
  return createPortal(
    <div style={{ position: 'absolute', top: pos.top, left: pos.left, zIndex: 9999, width: 208, pointerEvents: 'none', backgroundColor: 'var(--popover, white)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px', boxShadow: '0 4px 16px rgba(0,0,0,0.18)' }}>
      <p style={{ fontWeight: 600, fontSize: 12, marginBottom: 4 }}>🔒 Asignación bloqueada</p>
      <p style={{ fontSize: 11, color: 'var(--muted-foreground)', lineHeight: 1.5 }}>
        Entrega programada para el <strong style={{ color: 'var(--foreground)' }}>{fechaLabel}</strong>. Se puede asignar el día anterior o el mismo día de entrega.
      </p>
    </div>,
    document.body
  )
}

export default function PedidosPage() {
  const qc = useQueryClient()
  const [filtro, setFiltro] = useState('todos')
  const [selected, setSelected] = useState(null)
  const [asignarModal, setAsignarModal] = useState(null)
  const [distId, setDistId] = useState('')
  const [asignando, setAsignando] = useState(false)
  const [asignarError, setAsignarError] = useState(null)
  const [fechaFiltro, setFechaFiltro] = useState(new Date().toISOString().slice(0, 10))
  const [distribuidorUbicaciones, setDistribuidorUbicaciones] = useState({})
  const [toastFallida, setToastFallida] = useState(null)
  const [toastAsignar, setToastAsignar] = useState(null)
  const [resaltado, setResaltado] = useState(null)
  const [cancelarModal, setCancelarModal] = useState(null)
  const [motivoCancelacion, setMotivoCancelacion] = useState('')
  const [motivoCustom, setMotivoCustom] = useState('')
  const [cancelando, setCancelando] = useState(false)
useSocket({
  nuevo_pedido: () => {
    qc.invalidateQueries({ queryKey: ['pedidos'], exact: false })
  },
  pedido_actualizado: (data) => {
    qc.invalidateQueries({ queryKey: ['pedidos'], exact: false })
    if (data?.parada?.notas_entrega || (data?.estado === 'pendiente' && data?.parada?.estado === 'fallida')) {
      setToastFallida({
        numero: data.numero_pedido,
        cliente: `${data.cliente?.nombre || ''} ${data.cliente?.apellido || ''}`.trim(),
        motivo: data.parada?.notas_entrega || 'Sin motivo especificado'
      })
      setTimeout(() => setToastFallida(null), 8000)
    }
  },
  ubicacion_distribuidor: (data) => setDistribuidorUbicaciones(prev => ({
    ...prev,
    [data.distribuidor_id]: { lat: data.lat, lng: data.lng }
  })),
})

  const { data: pedidos = [], isLoading } = useQuery({
    queryKey: ['pedidos', filtro],
    queryFn: () => pedidosApi.listar(filtro !== 'todos' ? { estado: filtro } : {}),
    select: r => r.data.data,
  })

  const { data: distribuidores = [] } = useQuery({
    queryKey: ['distribuidores'],
    queryFn: () => usuariosApi.listar({ rol: 'distribuidor' }),
    select: r => r.data.data.filter(d => d.activo),
  })

  const estadoMut = useMutation({
    mutationFn: ({ id, estado, notas }) => pedidosApi.cambiarEstado(id, estado, notas),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pedidos'] }),
  })

  const handleCancelar = async () => {
    if (!cancelarModal) return
    const motivo = motivoCancelacion === 'Otro' ? motivoCustom : motivoCancelacion
    if (!motivo?.trim()) return
    setCancelando(true)
    try {
      await estadoMut.mutateAsync({ id: cancelarModal.id, estado: 'cancelado', notas: motivo })
      setCancelarModal(null); setMotivoCancelacion(''); setMotivoCustom('')
    } finally {
      setCancelando(false)
    }
  }

  const abrirCancelar = (pedido) => { setCancelarModal(pedido); setMotivoCancelacion(''); setMotivoCustom('') }

  const handleAsignar = async () => {
    if (!distId || !asignarModal) return
    setAsignando(true)
    try {
      const hoy = new Date().toISOString().slice(0, 10)
      await pedidosApi.asignar(asignarModal.id, { distribuidor_id: parseInt(distId) })
      const gpsDistribuidor = distribuidorUbicaciones[parseInt(distId)]
      await rutasApi.generar({ distribuidor_id: parseInt(distId), fecha: hoy, pedido_ids: [asignarModal.id], ...(gpsDistribuidor && { lat: gpsDistribuidor.lat, lng: gpsDistribuidor.lng }) })
      qc.invalidateQueries({ queryKey: ['pedidos'] }); qc.invalidateQueries({ queryKey: ['rutas'] })
      setAsignarModal(null); setDistId(''); setAsignarError(null)
    } catch (e) {
      setAsignarError(e.response?.data?.message || 'Error al asignar el pedido')
    } finally {
      setAsignando(false)
    }
  }

  const abrirAsignar = (pedido) => {
    setAsignarModal(pedido); setDistId(pedido.distribuidor_id ? String(pedido.distribuidor_id) : '')
    if (esFechaFutura(pedido.fecha_entrega_est)) {
      const fechaLabel = new Date(pedido.fecha_entrega_est).toLocaleDateString('es-EC', { weekday: 'long', day: 'numeric', month: 'long' })
      setAsignarError(`Entrega programada para el ${fechaLabel}. La asignación solo está disponible el día anterior o el mismo día de entrega.`)
    } else { setAsignarError(null) }
  }

  const irAPedido = (pedido) => {
    setFechaFiltro(''); setFiltro('todos'); setResaltado(pedido.id)
    setTimeout(() => { const fila = document.getElementById(`pedido-row-${pedido.id}`); if (fila) fila.scrollIntoView({ behavior: 'smooth', block: 'center' }) }, 100)
    setTimeout(() => setResaltado(null), 3000)
  }

  const pedidosFiltrados = fechaFiltro ? pedidos.filter(p => new Date(p.createdAt || p.created_at).toISOString().slice(0, 10) === fechaFiltro) : pedidos
  const pedidosFuturos = pedidos.filter(p => esFechaFutura(p.fecha_entrega_est) && ['pendiente', 'confirmado'].includes(p.estado)).sort((a, b) => new Date(a.fecha_entrega_est) - new Date(b.fecha_entrega_est))
  const motivoFinal = motivoCancelacion === 'Otro' ? motivoCustom : motivoCancelacion
  const puedeConfirmarCancelacion = !!motivoFinal && motivoFinal.trim().length > 0

  return (
    <div className="space-y-5 max-w-7xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground">Pedidos</h1>
          <p className="text-sm text-muted-foreground">{pedidosFiltrados.length} pedido{pedidosFiltrados.length !== 1 ? 's' : ''}{fechaFiltro && ` · ${labelFecha(fechaFiltro)}`}</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <DatePicker value={fechaFiltro} onChange={setFechaFiltro} />
          <div className="flex items-center gap-1.5 flex-wrap">
            <Filter className="h-4 w-4 text-muted-foreground" />
            {ESTADOS.map(e => (
              <button key={e} onClick={() => setFiltro(e)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors capitalize ${filtro === e ? 'bg-brand-600 text-white' : 'bg-card border border-border text-muted-foreground hover:text-foreground'}`}>
                {e === 'todos' ? 'Todos' : ESTADO_PEDIDO[e]?.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {pedidosFuturos.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Calendar className="h-3.5 w-3.5 text-blue-500" />
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Próximas entregas programadas</p>
            <span className="inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-[10px] font-bold">{pedidosFuturos.length}</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
            {pedidosFuturos.map(p => {
              const f = new Date(p.fecha_entrega_est)
              const diasRestantes = Math.ceil((f - new Date()) / (1000 * 60 * 60 * 24))
              return (
                <button key={p.id} onClick={() => irAPedido(p)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50/60 dark:bg-blue-950/20 hover:bg-blue-100 dark:hover:bg-blue-950/40 hover:border-blue-400 dark:hover:border-blue-600 transition-all text-left group w-full">
                  <div className="shrink-0 w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/50 border border-blue-200 dark:border-blue-800 flex flex-col items-center justify-center">
                    <span className="text-[9px] font-semibold text-blue-500 dark:text-blue-400 uppercase leading-none">{f.toLocaleDateString('es-EC', { month: 'short' })}</span>
                    <span className="text-base font-bold text-blue-700 dark:text-blue-300 leading-tight">{f.getDate()}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-foreground truncate">{p.numero_pedido}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{p.cliente?.nombre} {p.cliente?.apellido}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium ${ESTADO_PEDIDO[p.estado]?.color}`}>{ESTADO_PEDIDO[p.estado]?.label}</span>
                      <span className="text-[10px] text-blue-500 dark:text-blue-400 font-medium">en {diasRestantes}d</span>
                    </div>
                  </div>
                  <ChevronRight className="h-3.5 w-3.5 text-blue-400 group-hover:text-blue-600 shrink-0 transition-colors" />
                </button>
              )
            })}
          </div>
        </div>
      )}

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                {['Pedido', 'Cliente', 'Dirección', 'Total', 'Estado', 'Distribuidor', 'Fecha', 'Acciones'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading && <tr><td colSpan={8} className="px-4 py-10 text-center text-muted-foreground">Cargando...</td></tr>}
              {!isLoading && pedidosFiltrados.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-10 text-center text-muted-foreground">{fechaFiltro ? `Sin pedidos para ${labelFecha(fechaFiltro)}` : 'No hay pedidos'}</td></tr>
              )}
              {pedidosFiltrados.map(p => (
                <PedidoRow key={p.id} pedido={p} resaltado={resaltado === p.id} distribuidorUbicaciones={distribuidorUbicaciones}
                  onVer={() => setSelected(p)} onAsignar={() => abrirAsignar(p)}
                  onConfirmar={() => { estadoMut.mutate({ id: p.id, estado: 'confirmado' }); if (!p.distribuidor_id) setToastAsignar({ id: p.id, numero: p.numero_pedido, pedido: p }) }}
                  onCancelar={() => abrirCancelar(p)} />
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
        <span className="font-medium text-foreground">Fecha de entrega:</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-500" /><span className="text-red-500 font-medium">⚠ Vencida</span></span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500" /><span className="text-amber-500 font-medium">📅 Vence hoy</span></span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-500" /><span className="text-blue-500 font-medium">📅 Entrega futura</span></span>
      </div>

      {/* Modal detalle */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Pedido {selected?.numero_pedido}</DialogTitle></DialogHeader>
          <div className="px-6 pb-2 space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><p className="text-muted-foreground text-xs">Cliente</p><p className="font-medium">{selected?.cliente?.nombre} {selected?.cliente?.apellido}</p></div>
              <div><p className="text-muted-foreground text-xs">Teléfono</p><p className="font-medium">{selected?.cliente?.telefono || '—'}</p></div>
              <div className="col-span-2"><p className="text-muted-foreground text-xs">Dirección</p><p className="font-medium">{selected?.direccion?.direccion}</p></div>
              <div><p className="text-muted-foreground text-xs">Pago</p><p className="font-medium capitalize">{selected?.metodo_pago}</p></div>
              <div><p className="text-muted-foreground text-xs">Notas</p><p className="font-medium">{selected?.notas || '—'}</p></div>

              {/* ── Motivo cancelación ── */}
              {selected?.estado === 'cancelado' && selected?.notas && (
                <div className="col-span-2">
                  <p className="text-muted-foreground text-xs">Motivo de cancelación</p>
                  <div className="flex items-start gap-2 mt-1 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2.5">
                    <span className="text-red-500 shrink-0 mt-0.5">⚠️</span>
                    <p className="text-sm text-red-700 dark:text-red-400 font-medium">{selected.notas}</p>
                  </div>
                </div>
              )}
              {selected?.calificacion && (
                <div className="col-span-2">
                  <p className="text-muted-foreground text-xs">Calificación del cliente</p>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex">{[1,2,3,4,5].map(i => <span key={i} className={`text-lg ${i <= selected.calificacion ? 'text-yellow-400' : 'text-gray-200'}`}>★</span>)}</div>
                    <span className="text-sm font-medium">{selected.calificacion}/5</span>
                  </div>
                  {selected.comentario_calificacion && <p className="text-sm text-muted-foreground mt-1 italic">"{selected.comentario_calificacion}"</p>}
                </div>
              )}
              {selected?.parada?.notas_entrega && (
                <div className="col-span-2">
                  <p className="text-muted-foreground text-xs">Motivo entrega fallida</p>
                  <div className="flex items-start gap-2 mt-1 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2">
                    <span className="text-red-500 text-xs mt-0.5">⚠️</span>
                    <p className="font-medium text-red-700 dark:text-red-400 text-sm">{selected.parada.notas_entrega}</p>
                  </div>
                </div>
              )}
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Productos</p>
              <div className="space-y-1.5">
                {selected?.detalles?.map(d => (
                  <div key={d.id} className="flex items-center justify-between bg-muted/50 rounded-lg px-3 py-2 text-sm">
                    <span>{d.producto?.nombre} × {d.cantidad}</span>
                    <span className="font-semibold">{formatCurrency(d.subtotal)}</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between mt-3 font-bold text-sm border-t border-border pt-3">
                <span>Total</span><span>{formatCurrency(selected?.total)}</span>
              </div>
            </div>
          </div>
          <DialogFooter><Button variant="secondary" onClick={() => setSelected(null)}>Cerrar</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Modal cancelación con motivo ──────────────────────── */}
      <Dialog open={!!cancelarModal} onOpenChange={() => { setCancelarModal(null); setMotivoCancelacion(''); setMotivoCustom('') }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-950/40 flex items-center justify-center shrink-0">
                <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
              </div>
              Cancelar pedido
            </DialogTitle>
          </DialogHeader>
          <div className="px-6 pb-2 space-y-4">
            <div className="bg-muted/50 rounded-lg px-3 py-2.5 text-sm">
              <p className="font-semibold">{cancelarModal?.numero_pedido}</p>
              <p className="text-muted-foreground text-xs mt-0.5">{cancelarModal?.cliente?.nombre} {cancelarModal?.cliente?.apellido}</p>
            </div>
            <div className="space-y-2">
              <Label>Motivo de cancelación <span className="text-red-500">*</span></Label>
              <div className="grid grid-cols-1 gap-1.5">
                {MOTIVOS_CANCELACION.map(m => (
                  <button key={m} type="button" onClick={() => setMotivoCancelacion(m)}
                    className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg border text-sm text-left transition-colors ${
                      motivoCancelacion === m
                        ? 'border-red-400 bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400'
                        : 'border-border hover:border-muted-foreground/40 hover:bg-muted/50 text-foreground'
                    }`}>
                    <span className={`w-3.5 h-3.5 rounded-full border-2 shrink-0 flex items-center justify-center ${motivoCancelacion === m ? 'border-red-500' : 'border-muted-foreground/40'}`}>
                      {motivoCancelacion === m && <span className="w-1.5 h-1.5 rounded-full bg-red-500" />}
                    </span>
                    {m}
                  </button>
                ))}
              </div>
            </div>
            {motivoCancelacion === 'Otro' && (
              <div className="space-y-1.5">
                <Label>Especifica el motivo</Label>
                <textarea value={motivoCustom} onChange={e => setMotivoCustom(e.target.value)}
                  placeholder="Describe el motivo de la cancelación..." rows={3} autoFocus
                  className="w-full px-3 py-2 rounded-lg border border-border bg-card text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none" />
              </div>
            )}
            <div className="flex items-start gap-2 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2.5">
              <span className="text-amber-500 text-sm shrink-0 mt-0.5">📱</span>
              <p className="text-xs text-amber-700 dark:text-amber-300">Se enviará una notificación al cliente con el motivo de la cancelación.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => { setCancelarModal(null); setMotivoCancelacion(''); setMotivoCustom('') }}>Volver</Button>
            <Button onClick={handleCancelar} disabled={!puedeConfirmarCancelacion || cancelando} className="bg-red-600 hover:bg-red-700 text-white">
              <XCircle className="h-3.5 w-3.5" />
              {cancelando ? 'Cancelando...' : 'Confirmar cancelación'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Toast asignar */}
      {toastAsignar && (
        <div className="fixed bottom-6 right-6 z-50 max-w-sm w-full">
          <div className="bg-card border border-amber-200 dark:border-amber-700 rounded-xl shadow-xl p-4">
            <div className="flex items-start gap-3">
              <div className="shrink-0 w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-950/40 flex items-center justify-center"><AlertTriangle className="h-4 w-4 text-amber-600" /></div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-amber-800 dark:text-amber-400">Pedido confirmado — {toastAsignar.numero}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Aún no tiene distribuidor asignado</p>
              </div>
              <button onClick={() => setToastAsignar(null)} className="text-muted-foreground hover:text-foreground text-xs shrink-0">✕</button>
            </div>
            <div className="flex gap-2 mt-3">
              <button onClick={() => setToastAsignar(null)} className="flex-1 py-1.5 rounded-lg text-xs font-medium bg-muted hover:bg-muted/80 text-muted-foreground transition-colors">Después</button>
              <button onClick={() => { abrirAsignar(toastAsignar.pedido); setToastAsignar(null) }} className="flex-1 py-1.5 rounded-lg text-xs font-medium bg-amber-500 hover:bg-amber-600 text-white transition-colors">Asignar ahora</button>
            </div>
          </div>
        </div>
      )}

      {/* Toast entrega fallida */}
      {toastFallida && (
        <div className="fixed bottom-6 right-6 z-50 max-w-sm w-full animate-slide-in-right">
          <div className="bg-card border border-red-200 dark:border-red-800 rounded-xl shadow-xl p-4">
            <div className="flex items-start gap-3">
              <div className="shrink-0 w-8 h-8 rounded-full bg-red-100 dark:bg-red-950/40 flex items-center justify-center"><AlertTriangle className="h-4 w-4 text-red-600" /></div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-red-700 dark:text-red-400">Entrega fallida — {toastFallida.numero}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{toastFallida.cliente}</p>
                <p className="text-xs text-foreground mt-1 font-medium">Motivo: {toastFallida.motivo}</p>
              </div>
              <button onClick={() => setToastFallida(null)} className="text-muted-foreground hover:text-foreground text-xs shrink-0">✕</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal asignar */}
      <Dialog open={!!asignarModal} onOpenChange={() => { setAsignarModal(null); setDistId(''); setAsignarError(null) }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Asignar distribuidor</DialogTitle></DialogHeader>
          <div className="px-6 pb-2 space-y-4">
            <div className="bg-muted/50 rounded-lg p-3 text-sm">
              <p className="font-medium">{asignarModal?.numero_pedido}</p>
              <p className="text-muted-foreground text-xs mt-0.5">{asignarModal?.cliente?.nombre} {asignarModal?.cliente?.apellido}</p>
              <p className="text-muted-foreground text-xs">{asignarModal?.direccion?.direccion}</p>
            </div>
            <div className="space-y-1.5">
              <Label>Distribuidor</Label>
              <Select value={distId} onValueChange={setDistId}>
                <SelectTrigger><SelectValue placeholder="Seleccionar distribuidor" /></SelectTrigger>
                <SelectContent>{distribuidores.map(d => <SelectItem key={d.id} value={String(d.id)}>{d.nombre} {d.apellido}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 text-xs text-blue-700 dark:text-blue-300">
              💡 Al asignar, la ruta aparecerá automáticamente en la app del distribuidor.
            </div>
            {asignarError && (
              <div className="flex items-start gap-2 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                <span className="text-red-500 shrink-0">⚠️</span>
                <p className="text-xs text-red-700 dark:text-red-400">{asignarError}</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => { setAsignarModal(null); setDistId(''); setAsignarError(null) }}>Cancelar</Button>
            <Button disabled={!distId || asignando || !!asignarError} onClick={handleAsignar}>{asignando ? 'Asignando...' : 'Asignar y crear ruta'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function DatePicker({ value, onChange }) {
  const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
  const DIAS_SEMANA = ['Do','Lu','Ma','Mi','Ju','Vi','Sa']
  const hoy = new Date()
  const [open, setOpen] = useState(false)
  const [vistaFecha, setVistaFecha] = useState(value ? new Date(value + 'T12:00:00') : new Date())
  const fechaActual = value ? new Date(value + 'T12:00:00') : null
  const irMes = (delta) => { const d = new Date(vistaFecha); d.setMonth(d.getMonth() + delta); setVistaFecha(d) }
  const seleccionar = (dia) => {
    const fecha = new Date(vistaFecha.getFullYear(), vistaFecha.getMonth(), dia)
    if (fecha > hoy) return
    onChange(fecha.toISOString().slice(0, 10)); setOpen(false)
  }
  const labelValor = fechaActual ? (value === hoy.toISOString().slice(0, 10) ? 'Hoy' : `${fechaActual.getDate()} ${MESES[fechaActual.getMonth()].slice(0,3)} ${fechaActual.getFullYear()}`) : 'Todas las fechas'
  const year = vistaFecha.getFullYear(); const month = vistaFecha.getMonth()
  const total = new Date(year, month + 1, 0).getDate(); const inicio = new Date(year, month, 1).getDay()
  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} className="flex items-center gap-2 h-9 px-3 rounded-lg border border-border bg-card text-sm text-foreground hover:bg-muted transition-colors">
        <Calendar className="h-4 w-4 text-brand-500 shrink-0" />
        <span className="font-medium">{labelValor}</span>
        {value && <span onClick={e => { e.stopPropagation(); onChange('') }} className="ml-1 h-4 w-4 rounded-full bg-muted hover:bg-muted-foreground/20 flex items-center justify-center text-muted-foreground hover:text-foreground text-[10px] cursor-pointer transition-colors">✕</span>}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute top-11 left-0 z-50 w-72 rounded-2xl border border-border bg-card shadow-xl shadow-black/10 p-4 animate-fade-in">
            <div className="flex items-center justify-between mb-4">
              <button onClick={() => irMes(-1)} className="h-7 w-7 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors text-sm">‹</button>
              <span className="text-sm font-semibold text-foreground">{MESES[month]} {year}</span>
              <button onClick={() => irMes(1)} disabled={year === hoy.getFullYear() && month >= hoy.getMonth()} className="h-7 w-7 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors text-sm disabled:opacity-30 disabled:cursor-not-allowed">›</button>
            </div>
            <div className="grid grid-cols-7 mb-2">{DIAS_SEMANA.map(d => <div key={d} className="text-center text-[10px] font-medium text-muted-foreground py-1">{d}</div>)}</div>
            <div className="grid grid-cols-7 gap-0.5">
              {Array(inicio).fill(null).map((_, i) => <div key={`e${i}`} />)}
              {Array.from({ length: total }, (_, i) => i + 1).map(dia => {
                const estaFecha = new Date(year, month, dia)
                const esFuturo = estaFecha > hoy
                const esHoy = estaFecha.toISOString().slice(0,10) === hoy.toISOString().slice(0,10)
                const esSelec = value === estaFecha.toISOString().slice(0,10)
                return <button key={dia} onClick={() => seleccionar(dia)} disabled={esFuturo} className={`h-8 w-full rounded-lg text-xs font-medium transition-colors ${esFuturo ? 'opacity-25 cursor-not-allowed' : 'cursor-pointer'} ${esSelec ? 'bg-brand-600 text-white' : ''} ${esHoy && !esSelec ? 'border border-brand-400 text-brand-600 dark:text-brand-400' : ''} ${!esSelec && !esHoy && !esFuturo ? 'hover:bg-muted text-foreground' : ''}`}>{dia}</button>
              })}
            </div>
            <div className="flex gap-2 mt-3 pt-3 border-t border-border">
              {['Hoy','Ayer'].map((label, i) => {
                const d = new Date(); d.setDate(d.getDate() - i); const val = d.toISOString().slice(0,10)
                return <button key={label} onClick={() => { onChange(val); setOpen(false) }} className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${value === val ? 'bg-brand-600 text-white' : 'bg-muted hover:bg-muted/80 text-foreground'}`}>{label}</button>
              })}
              <button onClick={() => { onChange(''); setOpen(false) }} className="flex-1 py-1.5 rounded-lg text-xs font-medium bg-muted hover:bg-muted/80 text-muted-foreground transition-colors">Todos</button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function PedidoRow({ pedido: p, resaltado, distribuidorUbicaciones, onVer, onAsignar, onConfirmar, onCancelar }) {
  const rutaInfo = useRutaInfo(p, distribuidorUbicaciones)
  const enRuta = p.estado === 'en_ruta'
  const ubic = distribuidorUbicaciones[p.distribuidor_id]
  const bloqueado = esFechaFutura(p.fecha_entrega_est)
  const [showTooltip, setShowTooltip] = useState(false)
  const btnRef = useRef(null)
  const fechaLabel = p.fecha_entrega_est ? new Date(p.fecha_entrega_est).toLocaleDateString('es-EC', { day: 'numeric', month: 'short' }) : ''

  return (
    <tr id={`pedido-row-${p.id}`} className={`transition-all duration-500 ${resaltado ? 'bg-blue-50 dark:bg-blue-950/30 ring-2 ring-inset ring-blue-400 dark:ring-blue-600' : enRuta ? 'bg-purple-50/50 dark:bg-purple-950/10 hover:bg-purple-50 dark:hover:bg-purple-950/20' : 'hover:bg-muted/40'}`}>
      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
        <div className="flex flex-col gap-1">
          <span>{p.numero_pedido}</span>
          {p.parada?.notas_entrega && <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-400 w-fit"><AlertTriangle className="h-2.5 w-2.5" />Fallida</span>}
        </div>
      </td>
      <td className="px-4 py-3 font-medium whitespace-nowrap">{p.cliente?.nombre} {p.cliente?.apellido}<div className="text-xs text-muted-foreground font-normal">{p.cliente?.telefono}</div></td>
      <td className="px-4 py-3 text-xs text-muted-foreground max-w-[160px] truncate">{p.direccion?.direccion}</td>
      <td className="px-4 py-3 font-semibold">{formatCurrency(p.total)}</td>
      <td className="px-4 py-3">
        <div className="space-y-1">
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${ESTADO_PEDIDO[p.estado]?.color}`}>
            {enRuta && <span className="w-1.5 h-1.5 rounded-full bg-purple-500 mr-1.5 animate-pulse" />}
            {ESTADO_PEDIDO[p.estado]?.label}
          </span>
          {p.estado === 'entregado' && p.calificacion && <div className="flex items-center gap-0.5 mt-1">{[1,2,3,4,5].map(i => <span key={i} className={`text-xs ${i <= p.calificacion ? 'text-yellow-400' : 'text-gray-200'}`}>★</span>)}</div>}
          {enRuta && rutaInfo && <div className="flex gap-2 text-xs text-purple-600 dark:text-purple-400"><span className="flex items-center gap-0.5"><Navigation className="h-3 w-3" />{rutaInfo.distanciaKm} km</span><span className="flex items-center gap-0.5"><Clock className="h-3 w-3" />~{rutaInfo.duracionMin} min</span></div>}
          {enRuta && !rutaInfo && ubic && <div className="text-xs text-purple-400 animate-pulse">Calculando...</div>}
          {enRuta && !ubic && <div className="text-xs text-muted-foreground flex items-center gap-1"><Truck className="h-3 w-3" />En camino</div>}
        </div>
      </td>
      <td className="px-4 py-3 text-xs">
        {p.distribuidor
          ? <div><span>{p.distribuidor.nombre} {p.distribuidor.apellido}</span>{enRuta && ubic && <div className="text-xs text-green-600 flex items-center gap-0.5 mt-0.5"><span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse inline-block" />GPS activo</div>}</div>
          : <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400"><span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse inline-block" />Sin asignar</span>}
      </td>
      <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
        <div>{formatDate(p.fechaEntregaReal || p.createdAt || p.created_at)}</div>
        {p.fecha_entrega_est && p.estado !== 'entregado' && p.estado !== 'cancelado' && (() => {
          const f = new Date(p.fecha_entrega_est); const ahora = new Date()
          const vencida = f < ahora; const hoy = f - ahora < 24 * 60 * 60 * 1000
          const color = vencida ? 'text-red-500' : hoy ? 'text-amber-500' : 'text-blue-500'
          const bg = vencida ? 'bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800' : hoy ? 'bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800' : 'bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-800'
          return <div className={`flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded border w-fit ${color} ${bg}`}><span>{vencida ? '⚠' : '📅'}</span>{f.toLocaleDateString('es-EC', { day: 'numeric', month: 'short' })} {f.toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' })}</div>
        })()}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1.5">
          <Button size="icon" variant="ghost" onClick={onVer} title="Ver detalle"><Eye className="h-4 w-4" /></Button>
          {p.parada?.notas_entrega && <Button size="icon" variant="ghost" onClick={onVer} title={`Entrega fallida: ${p.parada.notas_entrega}`} className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"><AlertTriangle className="h-4 w-4" /></Button>}
          {(p.estado === 'pendiente' || p.estado === 'confirmado') && (
            <div ref={btnRef} className="relative inline-flex" onMouseEnter={() => bloqueado && setShowTooltip(true)} onMouseLeave={() => setShowTooltip(false)}>
              {bloqueado && <span className="absolute inset-0 z-10 cursor-not-allowed rounded-md" />}
              <Button size="icon" variant="ghost" onClick={bloqueado ? undefined : onAsignar} className={bloqueado ? 'opacity-40' : ''}><UserCheck className="h-4 w-4" /></Button>
              {showTooltip && bloqueado && <TooltipBloqueado anchorRef={btnRef} fechaLabel={fechaLabel} />}
            </div>
          )}
          {p.estado === 'pendiente' && <Button size="sm" variant="outline" onClick={onConfirmar}>Confirmar</Button>}
          {p.estado === 'pendiente' && <Button size="sm" variant="danger" onClick={onCancelar}>Cancelar</Button>}
        </div>
      </td>
    </tr>
  )
}