import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { productosApi } from '@/services/api'
import { Card, Button, Input, Label, Select, SelectTrigger, SelectValue, SelectContent, SelectItem, Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui'
import { formatCurrency } from '@/lib/utils'
import { Plus, Settings2, Trash2, Package, AlertTriangle, ChevronDown, ChevronUp, RotateCcw } from 'lucide-react'
import { ImageUpload } from '@/components/ui/ImageUpload'

const TAMANIOS = {
  botellon: [
    { label: '5 L',  volumen: 5,  unidad: 'L' },
    { label: '10 L', volumen: 10, unidad: 'L' },
    { label: '15 L', volumen: 15, unidad: 'L' },
    { label: '20 L', volumen: 20, unidad: 'L' },
  ],
  botella: [
    { label: '250 ml',  volumen: 250,  unidad: 'ml' },
    { label: '500 ml',  volumen: 500,  unidad: 'ml' },
    { label: '600 ml',  volumen: 600,  unidad: 'ml' },
    { label: '1 L',     volumen: 1,    unidad: 'L'  },
    { label: '1.5 L',   volumen: 1.5,  unidad: 'L'  },
    { label: '2 L',     volumen: 2,    unidad: 'L'  },
  ],
}

const EMPTY = { nombre: '', descripcion: '', tipo: 'botellon', volumen_litros: 20, unidad: 'L', precio: '', stock: '', stock_minimo: 5, imagen_url: '', _custom: false }

// Limites de caracteres
const MAX_NOMBRE = 80
const MAX_DESCRIPCION = 500

// Devuelve 'agotado' | 'critico' | 'bajo' | 'ok'
function nivelStock(p) {
  const min = p.stock_minimo ?? 5
  if (p.stock === 0)      return 'agotado'
  if (p.stock <= min)     return 'critico'
  if (p.stock <= min * 2) return 'bajo'
  return 'ok'
}

const ALERT_COLOR = {
  agotado: 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800',
  critico: 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-800',
  bajo:    'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800',
}

export default function ProductosPage() {
  const qc = useQueryClient()
  const [modal, setModal]             = useState(null)
  const [form, setForm]               = useState(EMPTY)
  const [mostrarAlertas, setMostrarAlertas] = useState(true)
  const [confirmarEliminar, setConfirmarEliminar] = useState(null)
  const [mostrarDesactivados, setMostrarDesactivados] = useState(false)

  const { data: productos = [], isLoading } = useQuery({
    queryKey: ['productos-admin'],
    queryFn:  () => productosApi.listar(),
    select:   r => r.data.data,
  })

  const { data: stockBajo = [] } = useQuery({
    queryKey: ['productos-stock-bajo'],
    queryFn:  () => productosApi.stockBajo(),
    select:   r => r.data.data,
    refetchInterval: 5 * 60 * 1000,
  })

  const upsertMut = useMutation({
    mutationFn: (data) => modal?.id ? productosApi.actualizar(modal.id, data) : productosApi.crear(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['productos-admin'] })
      qc.invalidateQueries({ queryKey: ['productos-stock-bajo'] })
      setModal(null)
    },
  })

  const deleteMut = useMutation({
    mutationFn: (id) => productosApi.eliminar(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['productos-admin'] })
      qc.invalidateQueries({ queryKey: ['productos-stock-bajo'] })
    },
  })

  const eliminarDefinitivoMut = useMutation({
    mutationFn: (id) => productosApi.eliminarDefinitivo(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['productos-admin'] })
      qc.invalidateQueries({ queryKey: ['productos-stock-bajo'] })
    },
  })

  const { data: productosDesactivados = [] } = useQuery({
    queryKey: ['productos-desactivados'],
    queryFn:  () => productosApi.listarDesactivados(),
    select:   r => r.data.data,
    enabled:  mostrarDesactivados,
  })

  const reactivarMut = useMutation({
    mutationFn: (id) => productosApi.reactivar(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['productos-admin'] })
      qc.invalidateQueries({ queryKey: ['productos-desactivados'] })
      qc.invalidateQueries({ queryKey: ['productos-stock-bajo'] })
    },
  })

  const openCreate = () => { setForm(EMPTY); setModal('crear') }
  const openEdit   = (p)  => { setForm({ ...p, stock_minimo: p.stock_minimo ?? 5 }); setModal(p) }
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const tipoBadge = (t) => t === 'botellon'
    ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
    : 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400'

  return (
    <div className="space-y-5 max-w-6xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Productos</h1>
          <p className="text-sm text-muted-foreground">{productos.length} productos en catálogo</p>
        </div>
        <Button onClick={openCreate}><Plus className="h-4 w-4" />Nuevo producto</Button>
      </div>

      {/* ── Banner alertas stock bajo ─────────────────────── */}
      {stockBajo.length > 0 && (
        <div className="rounded-xl border border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-950/20 overflow-hidden">
          <button
            onClick={() => setMostrarAlertas(v => !v)}
            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-orange-100/50 dark:hover:bg-orange-950/30 transition-colors"
          >
            <div className="shrink-0 w-7 h-7 rounded-full bg-orange-100 dark:bg-orange-900/50 flex items-center justify-center">
              <AlertTriangle className="h-3.5 w-3.5 text-orange-600 dark:text-orange-400" />
            </div>
            <div className="flex-1 text-left">
              <span className="text-sm font-semibold text-orange-800 dark:text-orange-300">
                {stockBajo.length} producto{stockBajo.length !== 1 ? 's' : ''} con stock bajo o agotado
              </span>
              <span className="text-xs text-orange-600 dark:text-orange-400 ml-2">
                Requiere{stockBajo.length !== 1 ? 'n' : ''} reposición
              </span>
            </div>
            {mostrarAlertas
              ? <ChevronUp className="h-4 w-4 text-orange-500 shrink-0" />
              : <ChevronDown className="h-4 w-4 text-orange-500 shrink-0" />}
          </button>

          {mostrarAlertas && (
            <div className="px-4 pb-3 border-t border-orange-200 dark:border-orange-800">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 mt-3">
                {stockBajo.map(p => {
                  const nivel = nivelStock(p)
                  return (
                    <div key={p.id} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border ${ALERT_COLOR[nivel]}`}>
                      <Package className="h-4 w-4 shrink-0 opacity-70" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold truncate">{p.nombre}</p>
                        <p className="text-[10px] opacity-75">
                          {p.volumen_litros} {p.unidad} · {p.tipo === 'botellon' ? 'Botellón' : 'Botella'}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold leading-none">{p.stock}</p>
                        <p className="text-[10px] opacity-70">/ mín {p.stock_minimo ?? 5}</p>
                      </div>
                      <button
                        onClick={() => openEdit(p)}
                        className="shrink-0 text-[10px] font-medium underline underline-offset-2 opacity-70 hover:opacity-100 transition-opacity"
                      >
                        Editar
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {isLoading && <p className="text-muted-foreground text-sm">Cargando...</p>}

      {/* ── Grid de cards (igual al original) ────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {productos.map(p => (
          <Card key={p.id} className="animate-fade-in">
            <div className="p-5">
              <div className="w-full h-36 rounded-xl overflow-hidden bg-muted/40 mb-4 flex items-center justify-center">
                {p.imagen_url
                  ? <img src={p.imagen_url} alt={p.nombre} className="w-full h-full object-cover" />
                  : <Package className="h-10 w-10 text-muted-foreground/30" />
                }
              </div>

              <div className="flex items-start justify-between mb-2">
                <h3 className="font-semibold text-foreground">{p.nombre}</h3>
                <div className="flex gap-1 flex-wrap justify-end">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${tipoBadge(p.tipo)}`}>
                    {p.tipo === 'botellon' ? 'Botellón' : 'Botella'}
                  </span>
                </div>
              </div>

              {p.descripcion && (
                <details className="mb-4 group">
                  <summary className="text-xs text-muted-foreground cursor-pointer select-none list-none flex items-center gap-1">
                    <span className="line-clamp-2 group-open:line-clamp-none">{p.descripcion}</span>
                    {p.descripcion.length > 60 && (
                      <span className="shrink-0 text-brand-500 group-open:hidden">···</span>
                    )}
                  </summary>
                </details>
              )}

              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-muted/50 rounded-lg py-2">
                  <p className="text-xs text-muted-foreground">Volumen</p>
                  <p className="text-sm font-semibold">
                    {(() => {
                      const v = parseFloat(p.volumen_litros)
                      const n = v % 1 === 0 ? parseInt(v) : v
                      return `${n} ${p.unidad || 'L'}`
                    })()}
                  </p>
                </div>
                <div className="bg-muted/50 rounded-lg py-2">
                  <p className="text-xs text-muted-foreground">Precio</p>
                  <p className="text-sm font-semibold">{formatCurrency(p.precio)}</p>
                </div>
                <div className={`rounded-lg py-2 ${
                  nivelStock(p) === 'agotado' ? 'bg-red-50 dark:bg-red-950/30' :
                  nivelStock(p) === 'critico' ? 'bg-orange-50 dark:bg-orange-950/30' :
                  nivelStock(p) === 'bajo'    ? 'bg-amber-50 dark:bg-amber-950/30' :
                  'bg-muted/50'
                }`}>
                  <p className="text-xs text-muted-foreground">Stock</p>
                  <p className={`text-sm font-semibold ${
                    nivelStock(p) === 'agotado' ? 'text-red-600 dark:text-red-400' :
                    nivelStock(p) === 'critico' ? 'text-orange-600 dark:text-orange-400' :
                    nivelStock(p) === 'bajo'    ? 'text-amber-600 dark:text-amber-400' :
                    ''
                  }`}>{p.stock}</p>
                </div>
              </div>

              <div className="flex gap-2 mt-4">
                <Button variant="outline" size="sm" className="flex-1" onClick={() => openEdit(p)}>
                  <Settings2 className="h-3.5 w-3.5" />Editar
                </Button>
                <Button variant="ghost" size="icon" onClick={() => setConfirmarEliminar(p)}>
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* ── Modal crear/editar ────────────────────────────── */}
      <Dialog open={!!modal} onOpenChange={() => setModal(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{modal?.id ? 'Editar producto' : 'Nuevo producto'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); upsertMut.mutate(form) }} className="px-6 pb-2 space-y-4">
            <div className="grid grid-cols-2 gap-3">

              {/* Nombre — con contador de caracteres */}
              <div className="col-span-2 space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label>Nombre</Label>
                  <span className={`text-[11px] ${form.nombre.length >= MAX_NOMBRE ? 'text-red-500 font-medium' : 'text-muted-foreground'}`}>
                    {form.nombre.length}/{MAX_NOMBRE}
                  </span>
                </div>
                <Input
                  value={form.nombre}
                  onChange={e => set('nombre', e.target.value.slice(0, MAX_NOMBRE))}
                  placeholder="Ej: Botellón 20L"
                  maxLength={MAX_NOMBRE}
                  required
                />
              </div>

              {/* Tipo */}
              <div className="space-y-1.5">
                <Label>Tipo</Label>
                <Select value={form.tipo} onValueChange={v => {
                  const primero = TAMANIOS[v]?.[0]
                  setForm(f => ({ ...f, tipo: v, volumen_litros: primero?.volumen ?? '', unidad: primero?.unidad ?? 'L', _custom: false }))
                }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="botellon">Botellón</SelectItem>
                    <SelectItem value="botella">Botella</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Tamaño */}
              <div className="space-y-1.5">
                <Label>Tamaño</Label>
                <div className="grid grid-cols-3 gap-2">
                  {TAMANIOS[form.tipo]?.map(t => (
                    <button
                      key={t.label}
                      type="button"
                      onClick={() => { set('volumen_litros', t.volumen); set('unidad', t.unidad); set('_custom', false) }}
                      className={`py-2 px-3 rounded-lg border text-sm font-medium transition-colors
                        ${!form._custom && form.volumen_litros === t.volumen && form.unidad === t.unidad
                          ? 'bg-brand-600 text-white border-brand-600'
                          : 'border-border text-foreground hover:bg-muted'}`}
                    >
                      {t.label}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => { set('_custom', true); set('volumen_litros', ''); set('unidad', form.tipo === 'botellon' ? 'L' : 'ml') }}
                    className={`py-2 px-3 rounded-lg border text-sm font-medium transition-colors
                      ${form._custom
                        ? 'bg-brand-600 text-white border-brand-600'
                        : 'border-border text-muted-foreground hover:bg-muted'}`}
                  >
                    Otro
                  </button>
                </div>
                {form._custom && (
                  <div className="flex gap-2 mt-2">
                    <Input
                      type="number" min="1" step="any"
                      value={form.volumen_litros}
                      onChange={e => set('volumen_litros', e.target.value)}
                      placeholder="Ej: 330"
                      required className="flex-1" autoFocus
                    />
                    <Select value={form.unidad} onValueChange={v => set('unidad', v)}>
                      <SelectTrigger className="w-20"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ml">ml</SelectItem>
                        <SelectItem value="L">L</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {/* Precio */}
              <div className="space-y-1.5">
                <Label>Precio ($)</Label>
                <Input
                  type="number" step="0.01"
                  value={form.precio}
                  onChange={e => set('precio', e.target.value)}
                  placeholder="2.50" required
                />
              </div>

              {/* Stock */}
              <div className="space-y-1.5">
                <Label>Stock</Label>
                <Input
                  type="number"
                  value={form.stock}
                  onChange={e => set('stock', e.target.value)}
                  placeholder="100" required
                />
              </div>

              {/* ── NUEVO: Stock mínimo ── */}
              <div className="col-span-2 space-y-1.5">
                <Label className="flex items-center gap-1.5">
                  Stock mínimo
                  <span className="text-[11px] text-muted-foreground font-normal">(se mostrará alerta cuando el stock llegue a este valor)</span>
                </Label>
                <Input
                  type="number" min="0"
                  value={form.stock_minimo ?? 5}
                  onChange={e => set('stock_minimo', e.target.value)}
                  placeholder="5"
                />
              </div>

              {/* Descripción — con contador de caracteres */}
              <div className="col-span-2 space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label>Descripción</Label>
                  <span className={`text-[11px] ${form.descripcion.length >= MAX_DESCRIPCION ? 'text-red-500 font-medium' : 'text-muted-foreground'}`}>
                    {form.descripcion.length}/{MAX_DESCRIPCION}
                  </span>
                </div>
                <Input
                  value={form.descripcion}
                  onChange={e => set('descripcion', e.target.value.slice(0, MAX_DESCRIPCION))}
                  placeholder="Descripción opcional"
                  maxLength={MAX_DESCRIPCION}
                />
              </div>

              {/* Imagen */}
              <div className="col-span-2 space-y-1.5">
                <Label>Imagen del producto</Label>
                <ImageUpload
                  value={form.imagen_url}
                  onChange={(url) => set('imagen_url', url)}
                  carpeta="productos"
                />
              </div>

            </div>

            <DialogFooter className="px-0">
              <Button type="button" variant="secondary" onClick={() => setModal(null)}>Cancelar</Button>
              <Button type="submit" disabled={upsertMut.isPending}>
                {upsertMut.isPending ? 'Guardando...' : 'Guardar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      {/* ── Sección productos desactivados ───────────────── */}
      <div className="rounded-xl border border-border overflow-hidden">
        <button
          onClick={() => setMostrarDesactivados(v => !v)}
          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors bg-card"
        >
          <div className="shrink-0 w-7 h-7 rounded-full bg-muted flex items-center justify-center">
            <Package className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <div className="flex-1 text-left">
            <span className="text-sm font-semibold text-foreground">Productos desactivados</span>
            <span className="text-xs text-muted-foreground ml-2">Puedes reactivarlos cuando lo necesites</span>
          </div>
          {mostrarDesactivados
            ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
            : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
        </button>

        {mostrarDesactivados && (
          <div className="border-t border-border">
            {productosDesactivados.length === 0
              ? <p className="text-sm text-muted-foreground text-center py-8">No hay productos desactivados</p>
              : <div className="divide-y divide-border">
                  {productosDesactivados.map(p => (
                    <div key={p.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors">
                      {/* Imagen o icono */}
                      <div className="w-10 h-10 rounded-lg overflow-hidden bg-muted/50 flex items-center justify-center shrink-0">
                        {p.imagen_url
                          ? <img src={p.imagen_url} alt={p.nombre} className="w-full h-full object-cover opacity-60" />
                          : <Package className="h-5 w-5 text-muted-foreground/40" />
                        }
                      </div>
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-muted-foreground truncate">{p.nombre}</p>
                        <p className="text-xs text-muted-foreground/60">
                          {(() => {
                            const v = parseFloat(p.volumen_litros)
                            return `${v % 1 === 0 ? parseInt(v) : v} ${p.unidad || 'L'}`
                          })()} · {p.tipo === 'botellon' ? 'Botellón' : 'Botella'} · {formatCurrency(p.precio)}
                        </p>
                      </div>
                      {/* Botón reactivar */}
                      <Button
                        size="sm"
                        variant="outline"
                        className="shrink-0 text-green-600 border-green-200 hover:bg-green-50 hover:border-green-400 dark:text-green-400 dark:border-green-800 dark:hover:bg-green-950/30"
                        onClick={() => reactivarMut.mutate(p.id)}
                        disabled={reactivarMut.isPending}
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        Reactivar
                      </Button>
                    </div>
                  ))}
                </div>
            }
          </div>
        )}
      </div>

      {/* ── Modal confirmar eliminar ──────────────────────── */}
      <Dialog open={!!confirmarEliminar} onOpenChange={() => setConfirmarEliminar(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-950/40 flex items-center justify-center shrink-0">
                <Package className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              </div>
              Desactivar producto
            </DialogTitle>
          </DialogHeader>
          <div className="px-6 pb-2 space-y-3">
            <p className="text-sm text-muted-foreground">
              ¿Desactivar{' '}
              <span className="font-semibold text-foreground">"{confirmarEliminar?.nombre}"</span>?
            </p>
            <div className="bg-muted/50 rounded-xl px-4 py-3 text-xs text-muted-foreground">
              💡 Para proteger el historial de pedidos, solo se permite desactivar productos.
              Un producto desactivado no aparece en el catálogo pero sus ventas se conservan.
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setConfirmarEliminar(null)}>
              Cancelar
            </Button>
            <Button
              onClick={() => { deleteMut.mutate(confirmarEliminar.id); setConfirmarEliminar(null) }}
              disabled={deleteMut.isPending}
            >
              <Package className="h-3.5 w-3.5" />
              {deleteMut.isPending ? 'Desactivando...' : 'Desactivar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}