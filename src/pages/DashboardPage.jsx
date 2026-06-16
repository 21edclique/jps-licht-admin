import { useQuery } from '@tanstack/react-query'
import { pedidosApi, productosApi, usuariosApi } from '@/services/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui'
import { formatCurrency, ESTADO_PEDIDO, formatDate } from '@/lib/utils'
import { ShoppingBag, Package, Users, TrendingUp, Clock, CheckCircle, Truck, XCircle } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { useSocket } from '@/hooks/useSocket'
import { useQueryClient } from '@tanstack/react-query'

const StatCard = ({ icon: Icon, label, value, sub, color = 'brand' }) => (
  <Card className="animate-fade-in">
    <CardContent className="py-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold text-foreground mt-1">{value}</p>
          {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
        </div>
        <div className={`h-10 w-10 rounded-xl flex items-center justify-center bg-${color}-100 dark:bg-${color}-900/30`}>
          <Icon className={`h-5 w-5 text-${color}-600 dark:text-${color}-400`} />
        </div>
      </div>
    </CardContent>
  </Card>
)

const COLORS = ['#f59e0b', '#3b82f6', '#8b5cf6', '#22c55e', '#ef4444']

export default function DashboardPage() {
  const qc = useQueryClient()

  // Refrescar pedidos en tiempo real
  useSocket({
    nuevo_pedido:      () => qc.invalidateQueries({ queryKey: ['pedidos'] }),
    pedido_actualizado:() => qc.invalidateQueries({ queryKey: ['pedidos'] }),
  })

  const { data: pedidosData } = useQuery({
    queryKey: ['pedidos'],
    queryFn: () => pedidosApi.listar(),
    select: r => r.data.data,
  })

  const { data: productosData } = useQuery({
    queryKey: ['productos'],
    queryFn: () => productosApi.listar(),
    select: r => r.data.data,
  })

  const { data: usuariosData } = useQuery({
    queryKey: ['usuarios'],
    queryFn: () => usuariosApi.listar(),
    select: r => r.data.data,
  })

  const pedidos   = pedidosData  || []
  const productos = productosData || []
  const usuarios  = usuariosData  || []

  // Métricas
  const totalPedidos  = pedidos.length
  const entregados    = pedidos.filter(p => p.estado === 'entregado').length
  const pendientes    = pedidos.filter(p => p.estado === 'pendiente').length
  const enRuta        = pedidos.filter(p => p.estado === 'en_ruta').length
  const ingresoTotal  = pedidos.filter(p => p.estado === 'entregado').reduce((s, p) => s + parseFloat(p.total), 0)

  // Pedidos por estado para pie chart
  const pieData = Object.entries(ESTADO_PEDIDO).map(([key, val]) => ({
    name:  val.label,
    value: pedidos.filter(p => p.estado === key).length,
  })).filter(d => d.value > 0)

  // Pedidos últimos 7 días para area chart
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    const key = d.toISOString().slice(0, 10)
    return {
      dia: d.toLocaleDateString('es-EC', { weekday: 'short' }),
      pedidos: pedidos.filter(p => (p.createdAt || p.created_at)?.slice(0, 10) === key).length,
    }
  })

  // Últimos 5 pedidos
  const recientes = [...pedidos].sort((a, b) => new Date(b.createdAt || b.created_at) - new Date(a.createdAt || a.created_at)).slice(0, 5)

  return (
    <div className="space-y-6 max-w-7xl">
      <div>
        <h1 className="text-xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Resumen general del negocio</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={ShoppingBag}  label="Total pedidos"  value={totalPedidos} sub={`${pendientes} pendientes`} color="brand" />
        <StatCard icon={CheckCircle}  label="Entregados"     value={entregados}   sub="hoy y anteriores"          color="green" />
        <StatCard icon={Truck}        label="En ruta"        value={enRuta}       sub="en este momento"           color="purple" />
        <StatCard icon={TrendingUp}   label="Ingresos"       value={formatCurrency(ingresoTotal)} sub="pedidos entregados" color="brand" />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Area chart */}
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Pedidos últimos 7 días</CardTitle></CardHeader>
          <CardContent className="pb-6">
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={last7}>
                <defs>
                  <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="dia" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                <Area type="monotone" dataKey="pedidos" stroke="#3b97f2" strokeWidth={2} fill="url(#grad)" name="Pedidos" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Pie chart */}
        <Card>
          <CardHeader><CardTitle>Por estado</CardTitle></CardHeader>
          <CardContent className="flex flex-col items-center pb-6">
            <ResponsiveContainer width="100%" height={140}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={65} dataKey="value" paddingAngle={3}>
                  {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap gap-x-4 gap-y-1 justify-center mt-2">
              {pieData.map((d, i) => (
                <div key={d.name} className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                  <span className="text-xs text-muted-foreground">{d.name} ({d.value})</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent orders */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Pedidos recientes</CardTitle>
          <a href="/pedidos" className="text-xs text-brand-600 hover:underline">Ver todos →</a>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                {['Número', 'Cliente', 'Total', 'Estado', 'Fecha'].map(h => (
                  <th key={h} className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {recientes.length === 0 && (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">Sin pedidos aún</td></tr>
              )}
              {recientes.map(p => (
                <tr key={p.id} className="hover:bg-muted/40 transition-colors">
                  <td className="px-6 py-3 font-mono text-xs">{p.numero_pedido}</td>
                  <td className="px-6 py-3">{p.cliente?.nombre} {p.cliente?.apellido}</td>
                  <td className="px-6 py-3 font-medium">{formatCurrency(p.total)}</td>
                  <td className="px-6 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${ESTADO_PEDIDO[p.estado]?.color}`}>
                      {ESTADO_PEDIDO[p.estado]?.label}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-muted-foreground text-xs">{formatDate(p.createdAt || p.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}