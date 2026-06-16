import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { pedidosApi, productosApi, usuariosApi } from '@/services/api'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui'
import { formatCurrency, formatDateOnly, ESTADO_PEDIDO } from '@/lib/utils'
import { BotonExportarPDF } from './ReportePDF'

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, Legend, Cell, PieChart, Pie
} from 'recharts'
import { TrendingUp, Package, ShoppingBag, Truck, Star, Calendar, ChevronUp, ChevronDown } from 'lucide-react'

const DIAS_SEMANA = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
const COLORES = ['#2578E7', '#8B5CF6', '#0F6E56', '#F97316', '#E24B4A', '#F59E0B']

export default function ReportesPage() {
  const [tabActivo, setTabActivo] = useState('general')

  const { data: pedidos = [] } = useQuery({
    queryKey: ['pedidos-reporte'],
    queryFn: () => pedidosApi.listar(),
    select: r => r.data.data,
  })

  const { data: productos = [] } = useQuery({
    queryKey: ['productos-reporte'],
    queryFn: () => productosApi.listar(),
    select: r => r.data.data,
  })

  const { data: distribuidores = [] } = useQuery({
    queryKey: ['distribuidores-reporte'],
    queryFn: () => usuariosApi.listar({ rol: 'distribuidor' }),
    select: r => r.data.data,
  })

  // ── KPIs ──────────────────────────────────────────────────
  const entregados = pedidos.filter(p => p.estado === 'entregado')
  const totalIngresos = entregados.reduce((s, p) => s + parseFloat(p.total), 0)
  const tasaEntrega = pedidos.length ? ((entregados.length / pedidos.length) * 100).toFixed(1) : 0
  const ticketPromedio = entregados.length ? totalIngresos / entregados.length : 0
  const stockBajo = productos.filter(p => p.stock < (p.stock_minimo ?? 5)).length

  // ── Ingresos por día (últimos 30 días) ────────────────────
  const ingresosPorDia = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (29 - i))
    const key = d.toISOString().slice(0, 10)
    const del = pedidos.filter(p => (p.created_at || p.createdAt)?.slice(0, 10) === key && p.estado === 'entregado')
    return {
      dia: `${d.getDate()} ${MESES[d.getMonth()]}`,
      ingresos: del.reduce((s, p) => s + parseFloat(p.total), 0),
      pedidos: pedidos.filter(p => (p.created_at || p.createdAt)?.slice(0, 10) === key).length,
    }
  })

  // ── Productos más vendidos ────────────────────────────────
  const productoVentas = {}
  pedidos.forEach(p => p.detalles?.forEach(d => {
    const nombre = d.producto?.nombre || `Producto ${d.producto_id}`
    productoVentas[nombre] = (productoVentas[nombre] || 0) + d.cantidad
  }))
  const topProductos = Object.entries(productoVentas)
    .sort((a, b) => b[1] - a[1]).slice(0, 6)
    .map(([nombre, cantidad]) => ({ nombre: nombre.length > 16 ? nombre.slice(0, 16) + '…' : nombre, cantidad }))

  // ── Días con mayor venta ──────────────────────────────────
  // Por día de la semana
  const ventasPorDiaSemana = DIAS_SEMANA.map((dia, idx) => {
    const pedsDia = entregados.filter(p => {
      const fecha = new Date(p.created_at || p.createdAt)
      return fecha.getDay() === idx
    })
    return {
      dia,
      pedidos: pedsDia.length,
      ingresos: pedsDia.reduce((s, p) => s + parseFloat(p.total), 0),
    }
  })

  // Por mes (últimos 6 meses)
  const ventasPorMes = Array.from({ length: 6 }, (_, i) => {
    const d = new Date()
    d.setMonth(d.getMonth() - (5 - i))
    const mes = d.getMonth(); const anio = d.getFullYear()
    const pedsMes = entregados.filter(p => {
      const f = new Date(p.created_at || p.createdAt)
      return f.getMonth() === mes && f.getFullYear() === anio
    })
    return {
      mes: `${MESES[mes]} ${String(anio).slice(2)}`,
      pedidos: pedsMes.length,
      ingresos: pedsMes.reduce((s, p) => s + parseFloat(p.total), 0),
    }
  })

  // ── Desempeño distribuidores ──────────────────────────────
  const statsDistribuidores = distribuidores.map(d => {
    const misPedidos = pedidos.filter(p => p.distribuidor_id === d.id || p.distribuidor?.id === d.id)
    const entregados_d = misPedidos.filter(p => p.estado === 'entregado')
    const fallidos_d = misPedidos.filter(p => p.parada?.estado === 'fallida')
    const enRuta_d = misPedidos.filter(p => p.estado === 'en_ruta')
    const ingresos_d = entregados_d.reduce((s, p) => s + parseFloat(p.total), 0)
    const tasa_d = misPedidos.length ? ((entregados_d.length / misPedidos.length) * 100).toFixed(1) : '—'

    // Calificación promedio
    const calif = entregados_d.filter(p => p.calificacion != null)
    const califPromedio = calif.length
      ? (calif.reduce((s, p) => s + p.calificacion, 0) / calif.length).toFixed(1)
      : null

    return {
      id: d.id,
      nombre: `${d.nombre} ${d.apellido}`,
      total: misPedidos.length,
      entregados: entregados_d.length,
      fallidos: fallidos_d.length,
      enRuta: enRuta_d.length,
      ingresos: ingresos_d,
      tasa: tasa_d,
      calificacion: califPromedio,
    }
  }).sort((a, b) => b.entregados - a.entregados)

  const tabs = [
    { id: 'general', label: 'General', icon: TrendingUp },
    { id: 'distribuidores', label: 'Distribuidores', icon: Truck },
    { id: 'ventas', label: 'Días de mayor venta', icon: Calendar },
  ]

  return (
    <div className="space-y-5 max-w-7xl">
      <div>
        <h1 className="text-xl font-bold text-foreground">Reportes</h1>
        <p className="text-sm text-muted-foreground">Análisis y métricas del negocio</p>
      </div>
      <div><BotonExportarPDF
        pedidos={pedidos}
        productos={productos}
        distribuidores={distribuidores}
      /></div>

      {/* ── Tabs ──────────────────────────────────────────── */}
      <div className="flex gap-2 flex-wrap">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setTabActivo(id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tabActivo === id
                ? 'bg-brand-600 text-white'
                : 'bg-card border border-border text-muted-foreground hover:text-foreground'
              }`}>
            <Icon className="h-3.5 w-3.5" />{label}
          </button>
        ))}
      </div>

      {/* ── KPIs (siempre visibles) ────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Ingresos totales', value: formatCurrency(totalIngresos), icon: TrendingUp, color: 'blue-600' },
          { label: 'Tasa de entrega', value: `${tasaEntrega}%`, icon: ShoppingBag, color: 'green-600' },
          { label: 'Ticket promedio', value: formatCurrency(ticketPromedio), icon: TrendingUp, color: 'purple-600' },
          { label: 'Productos bajo stock', value: stockBajo, icon: Package, color: 'red-600' },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className="animate-fade-in">
            <CardContent className="py-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{label}</p>
                  <p className="text-2xl font-bold text-foreground mt-1">{value}</p>
                </div>
                <div className={`h-10 w-10 rounded-xl flex items-center justify-center bg-muted/60`}>
                  <Icon className={`h-5 w-5 text-${color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════
          TAB GENERAL
      ══════════════════════════════════════════════════════ */}
      {tabActivo === 'general' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle>Ingresos y pedidos — últimos 30 días</CardTitle></CardHeader>
              <CardContent className="pb-6">
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={ingresosPorDia}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="dia" tick={{ fontSize: 10 }} interval={4} axisLine={false} tickLine={false} />
                    <YAxis yAxisId="left" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis yAxisId="right" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} orientation="right" />
                    <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} formatter={(v, n) => n === 'Ingresos ($)' ? formatCurrency(v) : v} />
                    <Legend />
                    <Line yAxisId="left" type="monotone" dataKey="ingresos" stroke="#2578E7" strokeWidth={2} dot={false} name="Ingresos ($)" />
                    <Line yAxisId="right" type="monotone" dataKey="pedidos" stroke="#8B5CF6" strokeWidth={2} dot={false} name="Pedidos" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Productos más vendidos</CardTitle></CardHeader>
              <CardContent className="pb-6">
                {topProductos.length === 0
                  ? <p className="text-sm text-muted-foreground text-center py-10">Sin datos de ventas aún</p>
                  : <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={topProductos} layout="vertical">
                      <XAxis type="number" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis type="category" dataKey="nombre" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={110} />
                      <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                      <Bar dataKey="cantidad" radius={[0, 4, 4, 0]} name="Unidades vendidas">
                        {topProductos.map((_, i) => <Cell key={i} fill={COLORES[i % COLORES.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                }
              </CardContent>
            </Card>
          </div>

          {/* Resumen por estado */}
          <Card>
            <CardHeader><CardTitle>Resumen por estado</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {Object.entries(ESTADO_PEDIDO).map(([key, { label, color }]) => {
                  const cnt = pedidos.filter(p => p.estado === key).length
                  const total = pedidos.filter(p => p.estado === key).reduce((s, p) => s + parseFloat(p.total), 0)
                  return (
                    <div key={key} className="bg-muted/40 rounded-xl p-4 text-center">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${color} mb-2`}>{label}</span>
                      <p className="text-2xl font-bold text-foreground">{cnt}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{formatCurrency(total)}</p>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          TAB DISTRIBUIDORES
      ══════════════════════════════════════════════════════ */}
      {tabActivo === 'distribuidores' && (
        <div className="space-y-4">
          {/* Gráfico barras entregas por distribuidor */}
          <Card>
            <CardHeader><CardTitle>Entregas por distribuidor</CardTitle></CardHeader>
            <CardContent className="pb-6">
              {statsDistribuidores.length === 0
                ? <p className="text-sm text-muted-foreground text-center py-10">Sin datos de distribuidores</p>
                : <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={statsDistribuidores} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="nombre" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={120} />
                    <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                    <Legend />
                    <Bar dataKey="entregados" name="Entregados" fill="#0F6E56" radius={[0, 4, 4, 0]} stackId="a" />
                    <Bar dataKey="fallidos" name="Fallidos" fill="#E24B4A" radius={[0, 4, 4, 0]} stackId="a" />
                    <Bar dataKey="enRuta" name="En ruta" fill="#8B5CF6" radius={[0, 4, 4, 0]} stackId="a" />
                  </BarChart>
                </ResponsiveContainer>
              }
            </CardContent>
          </Card>

          {/* Tabla detalle distribuidores */}
          <Card>
            <CardHeader><CardTitle>Desempeño detallado por distribuidor</CardTitle></CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      {['Distribuidor', 'Total asignados', 'Entregados', 'Fallidos', 'En ruta', 'Tasa entrega', 'Ingresos generados', 'Calificación'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {statsDistribuidores.length === 0 && (
                      <tr><td colSpan={8} className="px-4 py-8 text-center text-muted-foreground text-sm">Sin datos disponibles</td></tr>
                    )}
                    {statsDistribuidores.map((d, i) => (
                      <tr key={d.id} className="hover:bg-muted/40 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                              style={{ backgroundColor: COLORES[i % COLORES.length] }}>
                              {d.nombre.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                            </div>
                            <span className="font-medium">{d.nombre}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center font-semibold">{d.total}</td>
                        <td className="px-4 py-3 text-center">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 dark:bg-green-950/30 text-green-700 dark:text-green-400">
                            {d.entregados}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {d.fallidos > 0
                            ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 dark:bg-red-950/30 text-red-700 dark:text-red-400">{d.fallidos}</span>
                            : <span className="text-muted-foreground text-xs">—</span>}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {d.enRuta > 0
                            ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-100 dark:bg-purple-950/30 text-purple-700 dark:text-purple-400">{d.enRuta}</span>
                            : <span className="text-muted-foreground text-xs">—</span>}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`text-xs font-semibold ${d.tasa === '—' ? 'text-muted-foreground'
                              : parseFloat(d.tasa) >= 90 ? 'text-green-600 dark:text-green-400'
                                : parseFloat(d.tasa) >= 70 ? 'text-amber-600 dark:text-amber-400'
                                  : 'text-red-600 dark:text-red-400'
                            }`}>{d.tasa}{d.tasa !== '—' ? '%' : ''}</span>
                        </td>
                        <td className="px-4 py-3 font-semibold text-brand-600">{formatCurrency(d.ingresos)}</td>
                        <td className="px-4 py-3">
                          {d.calificacion
                            ? <div className="flex items-center gap-1">
                              <Star className="h-3.5 w-3.5 text-yellow-400 fill-yellow-400" />
                              <span className="text-sm font-semibold">{d.calificacion}</span>
                              <span className="text-xs text-muted-foreground">/5</span>
                            </div>
                            : <span className="text-xs text-muted-foreground">Sin calificaciones</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          TAB DÍAS DE MAYOR VENTA
      ══════════════════════════════════════════════════════ */}
      {tabActivo === 'ventas' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

            {/* Por día de la semana */}
            <Card>
              <CardHeader><CardTitle>Ventas por día de la semana</CardTitle></CardHeader>
              <CardContent className="pb-6">
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={ventasPorDiaSemana}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="dia" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis yAxisId="left" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis yAxisId="right" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} orientation="right" />
                    <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }}
                      formatter={(v, n) => n === 'Ingresos ($)' ? formatCurrency(v) : v} />
                    <Legend />
                    <Bar yAxisId="left" dataKey="ingresos" name="Ingresos ($)" radius={[4, 4, 0, 0]}>
                      {ventasPorDiaSemana.map((entry, i) => {
                        const max = Math.max(...ventasPorDiaSemana.map(d => d.ingresos))
                        return <Cell key={i} fill={entry.ingresos === max ? '#2578E7' : '#93C5FD'} />
                      })}
                    </Bar>
                    <Bar yAxisId="right" dataKey="pedidos" name="Pedidos" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
                {/* Mejor día */}
                {(() => {
                  const mejor = ventasPorDiaSemana.reduce((a, b) => b.ingresos > a.ingresos ? b : a, ventasPorDiaSemana[0])
                  return mejor.ingresos > 0 ? (
                    <div className="mt-3 flex items-center gap-2 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg px-3 py-2">
                      <TrendingUp className="h-4 w-4 text-blue-600 shrink-0" />
                      <p className="text-xs text-blue-700 dark:text-blue-300">
                        <span className="font-semibold">{mejor.dia}</span> es el día con más ventas —{' '}
                        {formatCurrency(mejor.ingresos)} en {mejor.pedidos} pedido{mejor.pedidos !== 1 ? 's' : ''}
                      </p>
                    </div>
                  ) : null
                })()}
              </CardContent>
            </Card>

            {/* Por mes */}
            <Card>
              <CardHeader><CardTitle>Ventas por mes — últimos 6 meses</CardTitle></CardHeader>
              <CardContent className="pb-6">
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={ventasPorMes}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="mes" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis yAxisId="left" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis yAxisId="right" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} orientation="right" />
                    <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }}
                      formatter={(v, n) => n === 'Ingresos ($)' ? formatCurrency(v) : v} />
                    <Legend />
                    <Bar yAxisId="left" dataKey="ingresos" name="Ingresos ($)" fill="#2578E7" radius={[4, 4, 0, 0]}>
                      {ventasPorMes.map((entry, i) => {
                        const max = Math.max(...ventasPorMes.map(d => d.ingresos))
                        return <Cell key={i} fill={entry.ingresos === max ? '#1E4488' : '#2578E7'} />
                      })}
                    </Bar>
                    <Bar yAxisId="right" dataKey="pedidos" name="Pedidos" fill="#0F6E56" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
                {(() => {
                  const mejor = ventasPorMes.reduce((a, b) => b.ingresos > a.ingresos ? b : a, ventasPorMes[0])
                  return mejor.ingresos > 0 ? (
                    <div className="mt-3 flex items-center gap-2 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg px-3 py-2">
                      <TrendingUp className="h-4 w-4 text-green-600 shrink-0" />
                      <p className="text-xs text-green-700 dark:text-green-300">
                        <span className="font-semibold">{mejor.mes}</span> fue el mejor mes —{' '}
                        {formatCurrency(mejor.ingresos)} en {mejor.pedidos} pedido{mejor.pedidos !== 1 ? 's' : ''}
                      </p>
                    </div>
                  ) : null
                })()}
              </CardContent>
            </Card>
          </div>

          {/* Tabla top días con más ventas (histórico) */}
          <Card>
            <CardHeader><CardTitle>Top 10 días con más ventas (histórico)</CardTitle></CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      {['#', 'Fecha', 'Día de la semana', 'Pedidos', 'Ingresos'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {(() => {
                      const porFecha = {}
                      entregados.forEach(p => {
                        const key = (p.created_at || p.createdAt)?.slice(0, 10)
                        if (!key) return
                        if (!porFecha[key]) porFecha[key] = { ingresos: 0, pedidos: 0 }
                        porFecha[key].ingresos += parseFloat(p.total)
                        porFecha[key].pedidos += 1
                      })
                      const top10 = Object.entries(porFecha)
                        .sort((a, b) => b[1].ingresos - a[1].ingresos)
                        .slice(0, 10)

                      if (top10.length === 0) return (
                        <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground text-sm">Sin datos disponibles</td></tr>
                      )

                      return top10.map(([fecha, { ingresos, pedidos }], i) => {
                        const d = new Date(fecha + 'T12:00:00')
                        return (
                          <tr key={fecha} className={`hover:bg-muted/40 transition-colors ${i === 0 ? 'bg-blue-50/50 dark:bg-blue-950/10' : ''}`}>
                            <td className="px-4 py-3">
                              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${i === 0 ? 'bg-blue-600 text-white' : i < 3 ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400' : 'bg-muted text-muted-foreground'}`}>
                                {i + 1}
                              </span>
                            </td>
                            <td className="px-4 py-3 font-medium">
                              {d.toLocaleDateString('es-EC', { day: 'numeric', month: 'long', year: 'numeric' })}
                            </td>
                            <td className="px-4 py-3 text-muted-foreground">
                              {DIAS_SEMANA[d.getDay()]}
                            </td>
                            <td className="px-4 py-3 text-center font-semibold">{pedidos}</td>
                            <td className="px-4 py-3 font-bold text-brand-600">{formatCurrency(ingresos)}</td>
                          </tr>
                        )
                      })
                    })()}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}