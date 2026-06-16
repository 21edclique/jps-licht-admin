/**
 * ReportePDF.jsx — Generador de reportes PDF para JPS Licht
 * 
 * INSTALACIÓN:
 *   npm install jspdf jspdf-autotable date-fns
 * 
 * USO en ReportesPage.jsx:
 *   import { BotonExportarPDF } from './ReportePDF'
 *   <BotonExportarPDF pedidos={pedidos} productos={productos} distribuidores={distribuidores} />
 */

import { useState } from 'react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { FileDown, Calendar, Loader2, ChevronDown } from 'lucide-react'

// ── Constantes ─────────────────────────────────────────────
const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
const DIAS_SEMANA = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb']

// Colores corporativos JPS Licht
const BRAND = {
  primary:   [37,  120, 231],   // #2578E7
  success:   [15,  110, 86],    // #0F6E56
  danger:    [226, 75,  74],    // #E24B4A
  warning:   [249, 115, 22],    // #F97316
  purple:    [139, 92,  246],   // #8B5CF6
  dark:      [15,  23,  42],    // #0F172A
  gray:      [100, 116, 139],   // #64748B
  lightGray: [241, 245, 249],   // #F1F5F9
  white:     [255, 255, 255],
}

// ── Helpers ────────────────────────────────────────────────
const fmt = (n) => `$${parseFloat(n || 0).toFixed(2)}`
const fmtFecha = (iso) => {
  if (!iso) return '—'
  const d = new Date(iso)
  return `${d.getDate()} ${MESES[d.getMonth()]} ${d.getFullYear()}`
}
const fmtFechaCorta = (iso) => {
  if (!iso) return '—'
  const d = new Date(iso)
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`
}

const ESTADO_LABELS = {
  pendiente:  'Pendiente',
  confirmado: 'Confirmado',
  en_ruta:    'En ruta',
  entregado:  'Entregado',
  cancelado:  'Cancelado',
}

// ── Encabezado del PDF ────────────────────────────────────
function dibujarEncabezado(doc, titulo, subtitulo, rangoFechas) {
  const W = doc.internal.pageSize.getWidth()

  // Franja superior azul
  doc.setFillColor(...BRAND.primary)
  doc.rect(0, 0, W, 28, 'F')

  // Nombre empresa
  doc.setTextColor(...BRAND.white)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.text('JPS LICHT', 14, 11)

  // Subtítulo empresa
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.text('Sistema de gestión de pedidos — Agua Ozonizada', 14, 17)

  // Título del reporte (derecha)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.text(titulo.toUpperCase(), W - 14, 11, { align: 'right' })

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.text(subtitulo, W - 14, 17, { align: 'right' })

  // Rango de fechas y generación
  doc.setFillColor(...BRAND.lightGray)
  doc.rect(0, 28, W, 10, 'F')
  doc.setTextColor(...BRAND.gray)
  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  doc.text(`Período: ${rangoFechas}`, 14, 34.5)
  doc.text(
    `Generado: ${new Date().toLocaleDateString('es-EC', { day:'numeric', month:'long', year:'numeric', hour:'2-digit', minute:'2-digit' })}`,
    W - 14, 34.5, { align: 'right' }
  )

  return 42 // y inicial para contenido
}

// ── Pie de página ─────────────────────────────────────────
function dibujarPiePagina(doc) {
  const W = doc.internal.pageSize.getWidth()
  const H = doc.internal.pageSize.getHeight()
  const pages = doc.internal.getNumberOfPages()

  for (let i = 1; i <= pages; i++) {
    doc.setPage(i)
    doc.setFillColor(...BRAND.lightGray)
    doc.rect(0, H - 10, W, 10, 'F')
    doc.setTextColor(...BRAND.gray)
    doc.setFontSize(6.5)
    doc.setFont('helvetica', 'normal')
    doc.text('JPS Licht © 2026 — Confidencial', 14, H - 4)
    doc.text(`Página ${i} de ${pages}`, W - 14, H - 4, { align: 'right' })
  }
}

// ── KPI Box ───────────────────────────────────────────────
function dibujarKPI(doc, x, y, ancho, alto, label, valor, color = BRAND.primary) {
  doc.setFillColor(...color)
  doc.roundedRect(x, y, ancho, alto, 2, 2, 'F')
  doc.setTextColor(...BRAND.white)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.text(String(valor), x + ancho / 2, y + alto / 2 + 2, { align: 'center' })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(6.5)
  doc.text(label.toUpperCase(), x + ancho / 2, y + alto / 2 + 8, { align: 'center' })
  return y + alto + 4
}

// ════════════════════════════════════════════════════════════
// GENERADOR REPORTE GENERAL
// ════════════════════════════════════════════════════════════
function generarReporteGeneral(pedidos, productos, rangoFechas) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const W = doc.internal.pageSize.getWidth()

  let y = dibujarEncabezado(doc, 'Reporte General', 'Resumen ejecutivo del negocio', rangoFechas)

  // ── KPIs ──────────────────────────────────────────────
  const entregados     = pedidos.filter(p => p.estado === 'entregado')
  const totalIngresos  = entregados.reduce((s, p) => s + parseFloat(p.total || 0), 0)
  const tasaEntrega    = pedidos.length ? ((entregados.length / pedidos.length) * 100).toFixed(1) : 0
  const ticketProm     = entregados.length ? (totalIngresos / entregados.length).toFixed(2) : 0
  const stockBajo      = productos.filter(p => (p.stock || 0) < (p.stock_minimo || 5)).length

  y += 2
  const kpiW = (W - 28 - 9) / 4
  dibujarKPI(doc, 14,             y, kpiW, 22, 'Ingresos totales',   fmt(totalIngresos),  BRAND.primary)
  dibujarKPI(doc, 14 + kpiW + 3,  y, kpiW, 22, 'Tasa de entrega',   `${tasaEntrega}%`,   BRAND.success)
  dibujarKPI(doc, 14 + (kpiW+3)*2,y, kpiW, 22, 'Ticket promedio',   fmt(ticketProm),     BRAND.purple)
  dibujarKPI(doc, 14 + (kpiW+3)*3,y, kpiW, 22, 'Stock bajo',        stockBajo,           stockBajo > 0 ? BRAND.danger : BRAND.success)
  y += 30

  // ── Resumen por estado ────────────────────────────────
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(...BRAND.dark)
  doc.text('Pedidos por estado', 14, y)
  y += 4

  const estados = ['pendiente','confirmado','en_ruta','entregado','cancelado']
  const colores = [BRAND.warning, BRAND.primary, BRAND.purple, BRAND.success, BRAND.danger]
  autoTable(doc, {
    startY: y,
    head: [['Estado', 'Cantidad', 'Ingresos generados', '% del total']],
    body: estados.map((e, i) => {
      const cnt   = pedidos.filter(p => p.estado === e).length
      const total = pedidos.filter(p => p.estado === e).reduce((s, p) => s + parseFloat(p.total || 0), 0)
      const pct   = pedidos.length ? ((cnt / pedidos.length) * 100).toFixed(1) : 0
      return [ESTADO_LABELS[e], cnt, fmt(total), `${pct}%`]
    }),
    theme: 'grid',
    headStyles: { fillColor: BRAND.dark, textColor: BRAND.white, fontSize: 7.5, fontStyle: 'bold' },
    bodyStyles: { fontSize: 7.5, textColor: BRAND.dark },
    columnStyles: { 0: { fontStyle: 'bold' }, 1: { halign: 'center' }, 2: { halign: 'right' }, 3: { halign: 'center' } },
    alternateRowStyles: { fillColor: BRAND.lightGray },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 0) {
        const color = colores[data.row.index]
        if (color) data.cell.styles.textColor = color
      }
    },
    margin: { left: 14, right: 14 },
  })
  y = doc.lastAutoTable.finalY + 8

  // ── Tabla de pedidos ──────────────────────────────────
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(...BRAND.dark)
  doc.text(`Detalle de pedidos (${pedidos.length} registros)`, 14, y)
  y += 4

  autoTable(doc, {
    startY: y,
    head: [['N° Pedido', 'Fecha', 'Cliente', 'Distribuidor', 'Estado', 'Método pago', 'Total']],
    body: pedidos.map(p => [
      p.numero_pedido || '—',
      fmtFechaCorta(p.created_at || p.createdAt),
      p.cliente ? `${p.cliente.nombre} ${p.cliente.apellido}` : '—',
      p.distribuidor ? `${p.distribuidor.nombre} ${p.distribuidor.apellido}` : 'Sin asignar',
      ESTADO_LABELS[p.estado] || p.estado,
      p.metodo_pago === 'efectivo' ? 'Efectivo' : 'Transferencia',
      fmt(p.total),
    ]),
    theme: 'striped',
    headStyles: { fillColor: BRAND.primary, textColor: BRAND.white, fontSize: 7, fontStyle: 'bold' },
    bodyStyles: { fontSize: 6.5, textColor: BRAND.dark },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 28 },
      1: { cellWidth: 20 },
      4: { halign: 'center' },
      5: { halign: 'center' },
      6: { halign: 'right', fontStyle: 'bold' },
    },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: 14, right: 14 },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 4) {
        const estado = pedidos[data.row.index]?.estado
        const colorMap = { entregado: BRAND.success, cancelado: BRAND.danger, en_ruta: BRAND.purple, pendiente: BRAND.warning }
        if (colorMap[estado]) data.cell.styles.textColor = colorMap[estado]
      }
    },
  })

  dibujarPiePagina(doc)
  doc.save(`JPS_Licht_Reporte_General_${new Date().toISOString().slice(0,10)}.pdf`)
}

// ════════════════════════════════════════════════════════════
// GENERADOR REPORTE DISTRIBUIDORES
// ════════════════════════════════════════════════════════════
function generarReporteDistribuidores(pedidos, distribuidores, rangoFechas) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const W = doc.internal.pageSize.getWidth()

  let y = dibujarEncabezado(doc, 'Reporte Distribuidores', 'Desempeño por repartidor', rangoFechas)
  y += 2

  // Stats por distribuidor
  const stats = distribuidores.map(d => {
    const misPedidos  = pedidos.filter(p => p.distribuidor_id === d.id || p.distribuidor?.id === d.id)
    const entregados  = misPedidos.filter(p => p.estado === 'entregado')
    const fallidos    = misPedidos.filter(p => p.parada?.estado === 'fallida')
    const ingresos    = entregados.reduce((s, p) => s + parseFloat(p.total || 0), 0)
    const tasa        = misPedidos.length ? ((entregados.length / misPedidos.length) * 100).toFixed(1) : '0.0'
    const califItems  = entregados.filter(p => p.calificacion != null)
    const calif       = califItems.length
      ? (califItems.reduce((s, p) => s + p.calificacion, 0) / califItems.length).toFixed(1)
      : '—'
    return { d, misPedidos, entregados, fallidos, ingresos, tasa, calif }
  }).sort((a, b) => b.entregados.length - a.entregados.length)

  // KPIs globales distribuidores
  const totalEntregas = stats.reduce((s, x) => s + x.entregados.length, 0)
  const totalFallidos = stats.reduce((s, x) => s + x.fallidos.length, 0)
  const tasaGlobal    = (totalEntregas + totalFallidos) > 0
    ? ((totalEntregas / (totalEntregas + totalFallidos)) * 100).toFixed(1) : 0

  const kpiW = (W - 28 - 6) / 3
  dibujarKPI(doc, 14,             y, kpiW, 20, 'Total entregas',  totalEntregas, BRAND.success)
  dibujarKPI(doc, 14 + kpiW + 3,  y, kpiW, 20, 'Fallidos',       totalFallidos, totalFallidos > 0 ? BRAND.danger : BRAND.success)
  dibujarKPI(doc, 14 + (kpiW+3)*2,y, kpiW, 20, 'Tasa global',   `${tasaGlobal}%`, BRAND.primary)
  y += 28

  // Tabla resumen
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(...BRAND.dark)
  doc.text('Resumen por distribuidor', 14, y)
  y += 4

  autoTable(doc, {
    startY: y,
    head: [['Distribuidor', 'Asignados', 'Entregados', 'Fallidos', 'En ruta', 'Tasa entrega', 'Ingresos', 'Calificación']],
    body: stats.map(({ d, misPedidos, entregados, fallidos, ingresos, tasa, calif }) => [
      `${d.nombre} ${d.apellido}`,
      misPedidos.length,
      entregados.length,
      fallidos.length,
      misPedidos.filter(p => p.estado === 'en_ruta').length,
      `${tasa}%`,
      fmt(ingresos),
      calif !== '—' ? `${calif}/5` : '—',
    ]),
    theme: 'grid',
    headStyles: { fillColor: BRAND.dark, textColor: BRAND.white, fontSize: 7, fontStyle: 'bold' },
    bodyStyles: { fontSize: 7.5, textColor: BRAND.dark },
    columnStyles: {
      0: { fontStyle: 'bold' },
      1: { halign: 'center' },
      2: { halign: 'center' },
      3: { halign: 'center' },
      4: { halign: 'center' },
      5: { halign: 'center', fontStyle: 'bold' },
      6: { halign: 'right', fontStyle: 'bold' },
      7: { halign: 'center' },
    },
    alternateRowStyles: { fillColor: BRAND.lightGray },
    margin: { left: 14, right: 14 },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 5) {
        const tasa = parseFloat(data.cell.text[0])
        data.cell.styles.textColor = tasa >= 90 ? BRAND.success : tasa >= 70 ? BRAND.warning : BRAND.danger
      }
    },
  })
  y = doc.lastAutoTable.finalY + 8

  // Detalle por distribuidor
  for (const { d, misPedidos } of stats) {
    if (misPedidos.length === 0) continue

    // Nueva página si queda poco espacio
    if (y > 230) { doc.addPage(); y = 20 }

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8.5)
    doc.setTextColor(...BRAND.primary)
    doc.text(`${d.nombre} ${d.apellido} — Detalle de pedidos`, 14, y)
    y += 4

    autoTable(doc, {
      startY: y,
      head: [['N° Pedido', 'Fecha', 'Cliente', 'Estado', 'Total', 'Calificación']],
      body: misPedidos.map(p => [
        p.numero_pedido || '—',
        fmtFechaCorta(p.created_at || p.createdAt),
        p.cliente ? `${p.cliente.nombre} ${p.cliente.apellido}` : '—',
        ESTADO_LABELS[p.estado] || p.estado,
        fmt(p.total),
        p.calificacion ? `${p.calificacion}/5 ★` : '—',
      ]),
      theme: 'striped',
      headStyles: { fillColor: BRAND.primary, textColor: BRAND.white, fontSize: 7, fontStyle: 'bold' },
      bodyStyles: { fontSize: 6.5, textColor: BRAND.dark },
      columnStyles: {
        3: { halign: 'center' },
        4: { halign: 'right', fontStyle: 'bold' },
        5: { halign: 'center' },
      },
      margin: { left: 14, right: 14 },
    })
    y = doc.lastAutoTable.finalY + 6
  }

  dibujarPiePagina(doc)
  doc.save(`JPS_Licht_Distribuidores_${new Date().toISOString().slice(0,10)}.pdf`)
}

// ════════════════════════════════════════════════════════════
// GENERADOR REPORTE VENTAS POR PERÍODO
// ════════════════════════════════════════════════════════════
function generarReporteVentas(pedidos, rangoFechas) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const W = doc.internal.pageSize.getWidth()

  let y = dibujarEncabezado(doc, 'Reporte de Ventas', 'Análisis por período y días', rangoFechas)
  y += 2

  const entregados = pedidos.filter(p => p.estado === 'entregado')
  const ingresos   = entregados.reduce((s, p) => s + parseFloat(p.total || 0), 0)

  // KPIs ventas
  const kpiW = (W - 28 - 9) / 4
  dibujarKPI(doc, 14,              y, kpiW, 20, 'Pedidos entregados', entregados.length, BRAND.success)
  dibujarKPI(doc, 14 + kpiW + 3,   y, kpiW, 20, 'Ingresos totales',  fmt(ingresos),     BRAND.primary)
  dibujarKPI(doc, 14 + (kpiW+3)*2, y, kpiW, 20, 'Ticket promedio',   entregados.length ? fmt(ingresos / entregados.length) : '$0.00', BRAND.purple)
  dibujarKPI(doc, 14 + (kpiW+3)*3, y, kpiW, 20, 'Días con ventas',
    new Set(entregados.map(p => (p.created_at || p.createdAt)?.slice(0,10))).size, BRAND.warning)
  y += 28

  // ── Por día de la semana ──────────────────────────────
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(...BRAND.dark)
  doc.text('Ventas por día de la semana', 14, y)
  y += 4

  const porDia = DIAS_SEMANA.map((dia, idx) => {
    const peds = entregados.filter(p => new Date(p.created_at || p.createdAt).getDay() === idx)
    return [dia, peds.length, fmt(peds.reduce((s, p) => s + parseFloat(p.total || 0), 0))]
  })
  const maxDia = porDia.reduce((a, b) => parseFloat(b[2].replace('$','')) > parseFloat(a[2].replace('$','')) ? b : a, porDia[0])

  autoTable(doc, {
    startY: y,
    head: [['Día', 'Pedidos', 'Ingresos']],
    body: porDia,
    theme: 'grid',
    headStyles: { fillColor: BRAND.dark, textColor: BRAND.white, fontSize: 7.5, fontStyle: 'bold' },
    bodyStyles: { fontSize: 7.5, textColor: BRAND.dark },
    columnStyles: { 0: { fontStyle: 'bold' }, 1: { halign: 'center' }, 2: { halign: 'right', fontStyle: 'bold' } },
    alternateRowStyles: { fillColor: BRAND.lightGray },
    margin: { left: 14, right: 80 },
    didParseCell: (data) => {
      if (data.section === 'body' && data.cell.text[0] === maxDia[0]) {
        data.cell.styles.fillColor = [219, 234, 254] // azul claro
      }
    },
  })
  y = doc.lastAutoTable.finalY + 8

  // ── Top 10 días históricos ────────────────────────────
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(...BRAND.dark)
  doc.text('Top 10 días con más ventas (histórico)', 14, y)
  y += 4

  const porFecha = {}
  entregados.forEach(p => {
    const key = (p.created_at || p.createdAt)?.slice(0,10)
    if (!key) return
    if (!porFecha[key]) porFecha[key] = { ingresos: 0, pedidos: 0 }
    porFecha[key].ingresos += parseFloat(p.total || 0)
    porFecha[key].pedidos  += 1
  })

  const top10 = Object.entries(porFecha)
    .sort((a, b) => b[1].ingresos - a[1].ingresos)
    .slice(0, 10)
    .map(([fecha, { ingresos, pedidos }], i) => {
      const d = new Date(fecha + 'T12:00:00')
      return [
        `${i + 1}`,
        fmtFecha(fecha),
        DIAS_SEMANA[d.getDay()],
        pedidos,
        fmt(ingresos),
      ]
    })

  autoTable(doc, {
    startY: y,
    head: [['#', 'Fecha', 'Día', 'Pedidos', 'Ingresos']],
    body: top10.length > 0 ? top10 : [['—', 'Sin datos', '—', '—', '—']],
    theme: 'striped',
    headStyles: { fillColor: BRAND.primary, textColor: BRAND.white, fontSize: 7.5, fontStyle: 'bold' },
    bodyStyles: { fontSize: 7.5, textColor: BRAND.dark },
    columnStyles: {
      0: { halign: 'center', cellWidth: 10 },
      1: { fontStyle: 'bold' },
      2: { halign: 'center' },
      3: { halign: 'center' },
      4: { halign: 'right', fontStyle: 'bold' },
    },
    margin: { left: 14, right: 14 },
    didParseCell: (data) => {
      if (data.section === 'body' && data.row.index === 0) {
        data.cell.styles.fillColor = [219, 234, 254]
        data.cell.styles.textColor = BRAND.primary
        data.cell.styles.fontStyle = 'bold'
      }
    },
  })

  dibujarPiePagina(doc)
  doc.save(`JPS_Licht_Ventas_${new Date().toISOString().slice(0,10)}.pdf`)
}

// ════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL — Botón de exportar con selector
// ════════════════════════════════════════════════════════════
export function BotonExportarPDF({ pedidos = [], productos = [], distribuidores = [] }) {
  const [abierto,    setAbierto]    = useState(false)
  const [cargando,   setCargando]   = useState(null)
  const [fechaDesde, setFechaDesde] = useState('')
  const [fechaHasta, setFechaHasta] = useState('')
  const [mostrarFiltros, setMostrarFiltros] = useState(false)

  // Filtrar pedidos por rango de fechas
  const pedidosFiltrados = pedidos.filter(p => {
    if (!fechaDesde && !fechaHasta) return true
    const fecha = new Date(p.created_at || p.createdAt)
    if (fechaDesde && fecha < new Date(fechaDesde)) return false
    if (fechaHasta && fecha > new Date(fechaHasta + 'T23:59:59')) return false
    return true
  })

  const rangoFechas = fechaDesde || fechaHasta
    ? `${fechaDesde ? fmtFecha(fechaDesde) : 'Inicio'} — ${fechaHasta ? fmtFecha(fechaHasta) : 'Hoy'}`
    : 'Todos los registros'

  const generarPDF = async (tipo) => {
    setCargando(tipo)
    setAbierto(false)
    // Pequeño delay para que React actualice el UI antes del bloqueo
    await new Promise(r => setTimeout(r, 100))
    try {
      if (tipo === 'general')      generarReporteGeneral(pedidosFiltrados, productos, rangoFechas)
      if (tipo === 'distribuidores') generarReporteDistribuidores(pedidosFiltrados, distribuidores, rangoFechas)
      if (tipo === 'ventas')       generarReporteVentas(pedidosFiltrados, rangoFechas)
    } catch (err) {
      console.error('Error generando PDF:', err)
    } finally {
      setCargando(null)
    }
  }

  const opciones = [
    { tipo: 'general',        label: 'Reporte General',        desc: 'KPIs, estados y listado completo de pedidos' },
    { tipo: 'distribuidores', label: 'Reporte Distribuidores', desc: 'Desempeño y entregas por repartidor'         },
    { tipo: 'ventas',         label: 'Reporte de Ventas',      desc: 'Análisis por día, semana y top histórico'    },
  ]

return (
    <div className="relative flex items-center gap-2">
      {/* Botón filtro fechas */}
      <button
        onClick={() => { setMostrarFiltros(v => !v); setAbierto(false) }}
        className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm border transition-colors ${
          mostrarFiltros || fechaDesde || fechaHasta
            ? 'bg-brand-50 border-brand-300 text-brand-700 dark:bg-brand-950/30 dark:border-brand-700 dark:text-brand-400'
            : 'bg-card border-border text-muted-foreground hover:text-foreground'
        }`}
      >
        <Calendar className="h-3.5 w-3.5" />
        {fechaDesde || fechaHasta ? 'Fechas activas' : 'Filtrar fechas'}
      </button>

      {/* Botón exportar */}
      <button
        onClick={() => { setAbierto(v => !v); setMostrarFiltros(false) }}
        disabled={!!cargando}
        className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-60 transition-colors"
      >
        {cargando
          ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Generando...</>
          : <><FileDown className="h-3.5 w-3.5" /> Exportar PDF <ChevronDown className="h-3 w-3" /></>
        }
      </button>

      {/* Panel filtro fechas — aparece DEBAJO del botón de fechas */}
      {mostrarFiltros && (
        <div className="absolute left-0 top-10 z-50 bg-card border border-border rounded-xl shadow-xl p-4 w-72">
          <p className="text-xs font-semibold text-foreground mb-3">Rango de fechas para el reporte</p>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Desde</label>
              <input
                type="date"
                value={fechaDesde}
                onChange={e => setFechaDesde(e.target.value)}
                className="w-full px-3 py-1.5 text-sm rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Hasta</label>
              <input
                type="date"
                value={fechaHasta}
                onChange={e => setFechaHasta(e.target.value)}
                className="w-full px-3 py-1.5 text-sm rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => { setFechaDesde(''); setFechaHasta('') }}
                className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-border text-muted-foreground hover:text-foreground transition-colors"
              >
                Limpiar
              </button>
              <button
                onClick={() => setMostrarFiltros(false)}
                className="flex-1 px-3 py-1.5 text-xs rounded-lg bg-brand-600 text-white hover:bg-brand-700 transition-colors"
              >
                Aplicar
              </button>
            </div>
          </div>
          {(fechaDesde || fechaHasta) && (
            <p className="text-xs text-brand-600 dark:text-brand-400 mt-3 text-center font-medium">
              {pedidosFiltrados.length} pedido{pedidosFiltrados.length !== 1 ? 's' : ''} en el rango seleccionado
            </p>
          )}
        </div>
      )}

      {/* Dropdown tipos de reporte — aparece DEBAJO del botón exportar */}
      {abierto && (
         <div className="absolute left-0 top-10 z-50 bg-card border border-border rounded-xl shadow-xl overflow-hidden w-72">gith
          <div className="px-4 py-2.5 border-b border-border bg-muted/40">
            <p className="text-xs font-semibold text-foreground">Seleccionar reporte</p>
            <p className="text-xs text-muted-foreground mt-0.5 truncate">{rangoFechas}</p>
          </div>
          {opciones.map(({ tipo, label, desc }) => (
            <button
              key={tipo}
              onClick={() => generarPDF(tipo)}
              className="w-full text-left px-4 py-3 hover:bg-muted/60 transition-colors border-b border-border last:border-0"
            >
              <p className="text-sm font-medium text-foreground">{label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
            </button>
          ))}
        </div>
      )}

      {/* Overlay para cerrar al hacer clic fuera */}
      {(abierto || mostrarFiltros) && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => { setAbierto(false); setMostrarFiltros(false) }}
        />
      )}
    </div>
  )
}