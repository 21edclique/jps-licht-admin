import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { usuariosApi } from '@/services/api'
import { Card, Button, Input, Label, Select, SelectTrigger, SelectValue, SelectContent, SelectItem, Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui'
import { Plus, UserCheck, UserX, Users, Pencil, Trash2, AlertTriangle } from 'lucide-react'

const EMPTY = { nombre: '', apellido: '', email: '', password: '', telefono: '', rol: 'distribuidor' }

// Celular ecuatoriano: 10 digitos, empieza en 09
const TELEFONO_REGEX = /^09[0-9]{8}$/

export default function UsuariosPage() {
  const qc = useQueryClient()
  const [tab, setTab]         = useState('distribuidor')
  const [modal, setModal]     = useState(false)
  const [editModal, setEditModal] = useState(null)
  const [deleteModal, setDeleteModal] = useState(null)
  const [form, setForm]       = useState(EMPTY)
  const [editForm, setEditForm] = useState({})
  const [error, setError]     = useState(null)
  const [deleteError, setDeleteError] = useState(null)

  const { data: usuarios = [], isLoading } = useQuery({
    queryKey: ['usuarios', tab],
    queryFn:  () => usuariosApi.listar({ rol: tab }),
    select:   r => r.data.data,
  })

  const { data: admins = [] } = useQuery({
    queryKey: ['usuarios', 'admin'],
    queryFn:  () => usuariosApi.listar({ rol: 'admin' }),
    select:   r => r.data.data,
  })
  const adminsActivos = admins.filter(a => a.activo).length

  const crearMut = useMutation({
    mutationFn: (data) => usuariosApi.crear(data),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['usuarios'] }); setModal(false); setForm(EMPTY); setError(null) },
    onError:    (e) => setError(e.response?.data?.message || 'Error al crear usuario'),
  })

  const editarMut = useMutation({
    mutationFn: ({ id, data }) => usuariosApi.actualizar(id, data),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['usuarios'] }); setEditModal(null); setError(null) },
    onError:    (e) => setError(e.response?.data?.message || 'Error al editar usuario'),
  })

  const toggleMut = useMutation({
    mutationFn: ({ id, activo }) => usuariosApi.toggle(id, activo),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['usuarios'] }),
  })

  const eliminarMut = useMutation({
    mutationFn: (id) => usuariosApi.eliminar(id),
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: ['usuarios'] })
      setDeleteModal(null)
      setDeleteError(null)
    },
    onError: (e) => {
      const mensaje = e.response?.data?.message || 'Error al eliminar el usuario'
      setDeleteError(mensaje)
    },
  })

  const set  = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const setE = (k, v) => setEditForm(f => ({ ...f, [k]: v }))

  const rolColor = (rol) => ({
    admin:        'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
    distribuidor: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    cliente:      'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  })[rol] || ''

  const puedeEliminar = (u) => {
    if (u.rol !== 'admin') return true
    return adminsActivos > 1
  }

  const puedeDesactivar = (u) => {
    if (u.rol !== 'admin') return true
    return adminsActivos > 1
  }

  return (
    <div className="space-y-5 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Usuarios</h1>
          <p className="text-sm text-muted-foreground">Gestión de distribuidores y clientes</p>
        </div>
        {tab !== 'cliente' && (
          <Button onClick={() => { setForm({ ...EMPTY, rol: tab }); setModal(true); setError(null) }}>
            <Plus className="h-4 w-4" />Nuevo usuario
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-muted p-1 rounded-lg w-fit">
        {['distribuidor', 'cliente', 'admin'].map(r => (
          <button key={r} onClick={() => setTab(r)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors capitalize ${
              tab === r ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}>
            {r === 'distribuidor' ? 'Distribuidores' : r === 'cliente' ? 'Clientes' : 'Admins'}
          </button>
        ))}
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                {['Nombre', 'Email', 'Teléfono', 'Rol', 'Estado',
                  ...(tab !== 'cliente' ? ['Acciones'] : [])
                ].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading && <tr><td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">Cargando...</td></tr>}
              {!isLoading && usuarios.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                  <Users className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  No hay usuarios en esta categoría
                </td></tr>
              )}
              {usuarios.map(u => (
                <tr key={u.id} className="hover:bg-muted/40 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center text-xs font-bold text-brand-700 dark:text-brand-300">
                        {u.nombre?.[0]}{u.apellido?.[0]}
                      </div>
                      <p className="font-medium">{u.nombre} {u.apellido}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                  <td className="px-4 py-3 text-muted-foreground">{u.telefono || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${rolColor(u.rol)}`}>{u.rol}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`flex items-center gap-1.5 text-xs font-medium ${u.activo ? 'text-green-600' : 'text-gray-400'}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${u.activo ? 'bg-green-500' : 'bg-gray-400'}`} />
                      {u.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  {tab !== 'cliente' && (
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Button size="icon" variant="ghost"
                          onClick={() => { setEditModal(u); setEditForm({ nombre: u.nombre, apellido: u.apellido, telefono: u.telefono || '', password: '' }); setError(null) }}
                          title="Editar">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost"
                          disabled={!puedeDesactivar(u) && u.activo}
                          title={!puedeDesactivar(u) && u.activo ? 'Debe quedar al menos un admin activo' : u.activo ? 'Desactivar' : 'Activar'}
                          onClick={() => {
                            if (!puedeDesactivar(u) && u.activo) return
                            toggleMut.mutate({ id: u.id, activo: !u.activo })
                          }}>
                          {u.activo
                            ? <UserX className="h-4 w-4 text-red-500" />
                            : <UserCheck className="h-4 w-4 text-green-500" />}
                        </Button>
                        <Button size="icon" variant="ghost"
                          disabled={!puedeEliminar(u)}
                          title={!puedeEliminar(u) ? 'Debe quedar al menos un admin' : 'Eliminar'}
                          onClick={() => { if (puedeEliminar(u)) { setDeleteModal(u); setDeleteError(null) } }}>
                          <Trash2 className="h-4 w-4 text-red-400" />
                        </Button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal crear */}
      <Dialog open={modal} onOpenChange={() => { setModal(false); setError(null) }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nuevo usuario</DialogTitle></DialogHeader>
          <form onSubmit={(e) => {
            e.preventDefault()
            if (!/^[A-Za-záéíóúÁÉÍÓÚñÑ\s]{2,}$/.test(form.nombre))
              return setError('El nombre debe tener al menos 2 letras')
            if (!/^[A-Za-záéíóúÁÉÍÓÚñÑ\s]{2,}$/.test(form.apellido))
              return setError('El apellido debe tener al menos 2 letras')
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
              return setError('Ingresa un email válido')
            if (form.password.length < 8)
              return setError('La contraseña debe tener al menos 8 caracteres')
            // ── Validacion de celular ecuatoriano ──────────
            if (!form.telefono)
              return setError('El teléfono es obligatorio')
            if (!TELEFONO_REGEX.test(form.telefono))
              return setError('El teléfono debe tener 10 dígitos y empezar con 09 (Ej: 0991234567)')
            setError(null)
            crearMut.mutate(form)
          }} className="px-6 pb-2 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Nombre <span className="text-red-400">*</span></Label>
                <Input
                  value={form.nombre}
                  onChange={e => set('nombre', e.target.value.replace(/[^A-Za-záéíóúÁÉÍÓÚñÑ\s]/g, ''))}
                  placeholder="Ej: Juan"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label>Apellido <span className="text-red-400">*</span></Label>
                <Input
                  value={form.apellido}
                  onChange={e => set('apellido', e.target.value.replace(/[^A-Za-záéíóúÁÉÍÓÚñÑ\s]/g, ''))}
                  placeholder="Ej: Pérez"
                  required
                />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>Email <span className="text-red-400">*</span></Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={e => set('email', e.target.value.toLowerCase().trim())}
                  placeholder="correo@ejemplo.com"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label>Contraseña <span className="text-red-400">*</span></Label>
                <Input
                  type="password"
                  value={form.password}
                  onChange={e => set('password', e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                  minLength={8}
                  required
                />
                {form.password && form.password.length < 8 && (
                  <p className="text-xs text-amber-500">Mínimo 8 caracteres</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>Teléfono <span className="text-red-400">*</span></Label>
                <Input
                  value={form.telefono}
                  onChange={e => set('telefono', e.target.value.replace(/[^0-9]/g, '').slice(0, 10))}
                  placeholder="0991234567"
                  maxLength={10}
                  inputMode="numeric"
                  required
                />
                {form.telefono && !TELEFONO_REGEX.test(form.telefono) && (
                  <p className="text-xs text-amber-500">Debe tener 10 dígitos y empezar con 09</p>
                )}
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>Rol <span className="text-red-400">*</span></Label>
                <Select value={form.rol} onValueChange={v => set('rol', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="distribuidor">Distribuidor</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {error && <p className="text-xs text-red-500 bg-red-50 dark:bg-red-950/20 px-3 py-2 rounded-lg">⚠ {error}</p>}
            <DialogFooter className="px-0">
              <Button type="button" variant="secondary" onClick={() => setModal(false)}>Cancelar</Button>
              <Button type="submit" disabled={crearMut.isPending}>
                {crearMut.isPending ? 'Creando...' : 'Crear usuario'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal editar */}
      <Dialog open={!!editModal} onOpenChange={() => { setEditModal(null); setError(null) }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar — {editModal?.nombre} {editModal?.apellido}</DialogTitle></DialogHeader>
          <form onSubmit={(e) => {
            e.preventDefault()
            if (!/^[A-Za-záéíóúÁÉÍÓÚñÑ\s]{2,}$/.test(editForm.nombre))
              return setError('El nombre debe tener al menos 2 letras')
            if (!/^[A-Za-záéíóúÁÉÍÓÚñÑ\s]{2,}$/.test(editForm.apellido))
              return setError('El apellido debe tener al menos 2 letras')
            // ── Validacion de celular ecuatoriano ──────────
            if (!editForm.telefono)
              return setError('El teléfono es obligatorio')
            if (!TELEFONO_REGEX.test(editForm.telefono))
              return setError('El teléfono debe tener 10 dígitos y empezar con 09 (Ej: 0991234567)')
            if (editForm.password && editForm.password.length < 8)
              return setError('La contraseña debe tener al menos 8 caracteres')
            setError(null)
            const data = { nombre: editForm.nombre, apellido: editForm.apellido, telefono: editForm.telefono }
            if (editForm.password) data.password = editForm.password
            editarMut.mutate({ id: editModal.id, data })
          }} className="px-6 pb-2 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Nombre <span className="text-red-400">*</span></Label>
                <Input
                  value={editForm.nombre || ''}
                  onChange={e => setE('nombre', e.target.value.replace(/[^A-Za-záéíóúÁÉÍÓÚñÑ\s]/g, ''))}
                  placeholder="Ej: Juan"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label>Apellido <span className="text-red-400">*</span></Label>
                <Input
                  value={editForm.apellido || ''}
                  onChange={e => setE('apellido', e.target.value.replace(/[^A-Za-záéíóúÁÉÍÓÚñÑ\s]/g, ''))}
                  placeholder="Ej: Pérez"
                  required
                />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>Teléfono <span className="text-red-400">*</span></Label>
                <Input
                  value={editForm.telefono || ''}
                  onChange={e => setE('telefono', e.target.value.replace(/[^0-9]/g, '').slice(0, 10))}
                  placeholder="0991234567"
                  maxLength={10}
                  inputMode="numeric"
                  required
                />
                {editForm.telefono && !TELEFONO_REGEX.test(editForm.telefono) && (
                  <p className="text-xs text-amber-500">Debe tener 10 dígitos y empezar con 09</p>
                )}
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>Nueva contraseña <span className="text-muted-foreground text-xs">(dejar vacío para no cambiar)</span></Label>
                <Input
                  type="password"
                  value={editForm.password || ''}
                  onChange={e => setE('password', e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                />
                {editForm.password && editForm.password.length < 8 && (
                  <p className="text-xs text-amber-500">Mínimo 8 caracteres</p>
                )}
              </div>
            </div>
            {error && <p className="text-xs text-red-500 bg-red-50 dark:bg-red-950/20 px-3 py-2 rounded-lg">⚠ {error}</p>}
            <DialogFooter className="px-0">
              <Button type="button" variant="secondary" onClick={() => setEditModal(null)}>Cancelar</Button>
              <Button type="submit" disabled={editarMut.isPending}>
                {editarMut.isPending ? 'Guardando...' : 'Guardar cambios'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal confirmar eliminar */}
      <Dialog open={!!deleteModal} onOpenChange={() => { setDeleteModal(null); setDeleteError(null) }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Eliminar usuario</DialogTitle></DialogHeader>
          <div className="px-6 pb-2 space-y-4">
            {!deleteError ? (
              <div className="flex items-start gap-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                <AlertTriangle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-700 dark:text-red-400">¿Eliminar a {deleteModal?.nombre} {deleteModal?.apellido}?</p>
                  <p className="text-xs text-red-600/80 dark:text-red-400/70 mt-1">Esta acción no se puede deshacer.</p>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-700 dark:text-amber-400">No se puede eliminar</p>
                  <p className="text-xs text-amber-600/90 dark:text-amber-400/80 mt-1">{deleteError}</p>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => { setDeleteModal(null); setDeleteError(null) }}>
              {deleteError ? 'Entendido' : 'Cancelar'}
            </Button>
            {!deleteError && (
              <Button variant="danger" disabled={eliminarMut.isPending}
                onClick={() => eliminarMut.mutate(deleteModal.id)}>
                {eliminarMut.isPending ? 'Eliminando...' : 'Sí, eliminar'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}