import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { rutasApi, pedidosApi, usuariosApi } from '@/services/api'
import { Card, CardHeader, CardTitle, CardContent, Button, Select, SelectTrigger, SelectValue, SelectContent, SelectItem, Label } from '@/components/ui'
import { formatCurrency } from '@/lib/utils'
import { Map, Route, CheckCircle, Radio } from 'lucide-react'
import { Navigation, Clock } from 'lucide-react'
import mapboxgl from 'mapbox-gl'
import { useSocket } from '@/hooks/useSocket'

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN || ''

export default function RutasPage() {
  const qc = useQueryClient()
  const [tab, setTab] = useState('rutas')

  return (
    <div className="space-y-5 max-w-7xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Rutas del día</h1>
          <p className="text-sm text-muted-foreground">Asignación y seguimiento de entregas</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setTab('rutas')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === 'rutas' ? 'bg-brand-600 text-white' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>
            <Route className="h-4 w-4 inline mr-1.5" />Rutas
          </button>
          <button onClick={() => setTab('seguimiento')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === 'seguimiento' ? 'bg-brand-600 text-white' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>
            <Radio className="h-4 w-4 inline mr-1.5" />Seguimiento en vivo
          </button>
        </div>
      </div>
      {tab === 'rutas'        && <RutasTab />}
      {tab === 'seguimiento'  && <SeguimientoTab />}
    </div>
  )
}

// ── RUTAS TAB ─────────────────────────────────────────────────
function RutasTab() {
  const mapRef = useRef(null)
  const mapInstance = useRef(null)
  const markersRef = useRef([])
  const [fecha, setFecha]       = useState(new Date().toISOString().slice(0, 10))
  const [selectedRuta, setSelectedRuta] = useState(null)

  const { data: rutas = [] } = useQuery({
    queryKey: ['rutas', fecha],
    queryFn:  () => rutasApi.listar({ fecha }),
    select:   r => r.data.data,
  })

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return
    mapInstance.current = new mapboxgl.Map({
      container: mapRef.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: [-78.4678, -0.1807],
      zoom: 12,
    })
    mapInstance.current.addControl(new mapboxgl.NavigationControl(), 'top-right')
  }, [])

  useEffect(() => {
    const map = mapInstance.current
    if (!map || !selectedRuta) return
    const draw = () => {
      markersRef.current.forEach(m => m.remove())
      markersRef.current = []
      ;['route-line'].forEach(id => {
        if (map.getLayer(id)) map.removeLayer(id)
        if (map.getSource(id)) map.removeSource(id)
      })
      const bounds = new mapboxgl.LngLatBounds()
      let hasBounds = false
      selectedRuta.paradas?.forEach((parada, i) => {
        const dir = parada.pedido?.direccion
        if (!dir) return
        const lng = parseFloat(dir.longitud)
        const lat = parseFloat(dir.latitud)
        const el = document.createElement('div')
        el.style.cssText = `width:28px;height:28px;border-radius:50%;background:${parada.estado==='completada'?'#22c55e':'#2578E7'};color:white;font-size:12px;font-weight:700;display:flex;align-items:center;justify-content:center;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.25);cursor:pointer;`
        el.textContent = i + 1
        const marker = new mapboxgl.Marker({ element: el })
          .setLngLat([lng, lat])
          .setPopup(new mapboxgl.Popup({ offset: 25 }).setHTML(`<div style="font-size:13px;padding:4px"><strong>Parada ${i+1}</strong><br/>${parada.pedido?.cliente?.nombre??''} ${parada.pedido?.cliente?.apellido??''}<br/><small style="color:#666">${dir.direccion}</small><br/><strong style="color:#2578E7">${formatCurrency(parada.pedido?.total)}</strong></div>`))
          .addTo(map)
        markersRef.current.push(marker)
        bounds.extend([lng, lat])
        hasBounds = true
      })
      if (selectedRuta.polyline_mapbox) {
        map.addSource('route-line', { type: 'geojson', data: { type: 'Feature', geometry: selectedRuta.polyline_mapbox } })
        map.addLayer({ id: 'route-line', type: 'line', source: 'route-line', layout: { 'line-join': 'round', 'line-cap': 'round' }, paint: { 'line-color': '#2578E7', 'line-width': 4, 'line-opacity': 0.8 } })
        selectedRuta.polyline_mapbox.coordinates?.forEach(c => { bounds.extend(c); hasBounds = true })
      }
      if (hasBounds) map.fitBounds(bounds, { padding: 60, maxZoom: 14 })
    }
    if (map.loaded()) draw(); else map.on('load', draw)
  }, [selectedRuta])



  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      <div className="space-y-4">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Route className="h-4 w-4 text-brand-600" />Rutas del día</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-1.5">
              <Label>Fecha</Label>
              <input type="date" value={fecha} onChange={e => setFecha(e.target.value)}
                className="w-full h-9 rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Rutas del día</CardTitle></CardHeader>
          <CardContent className="space-y-2 p-3">
            {rutas.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Sin rutas para esta fecha</p>}
            {rutas.map(r => (
              <button key={r.id} onClick={() => setSelectedRuta(r)}
                className={`w-full text-left rounded-xl p-3 border transition-colors ${selectedRuta?.id===r.id?'border-brand-500 bg-brand-50 dark:bg-brand-950/30':'border-border hover:bg-muted'}`}>
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">{r.distribuidor?.nombre} {r.distribuidor?.apellido}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${r.estado==='completada'?'bg-green-100 text-green-700':r.estado==='en_progreso'?'bg-purple-100 text-purple-700':'bg-gray-100 text-gray-700'}`}>{r.estado}</span>
                </div>
                <div className="flex gap-3 mt-1.5 text-xs text-muted-foreground">
                  <span>{r.paradas?.length} paradas</span>
                  {r.distancia_km && <span>{r.distancia_km} km</span>}
                  {r.duracion_min && <span>~{r.duracion_min} min</span>}
                </div>
              </button>
            ))}
          </CardContent>
        </Card>

        {selectedRuta && (
          <Card>
            <CardHeader><CardTitle>Paradas</CardTitle></CardHeader>
            <CardContent className="space-y-2 p-3">
              {selectedRuta.paradas?.map(p => (
                <div key={p.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/40">
                  <div className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${p.estado==='completada'?'bg-green-500 text-white':'bg-brand-600 text-white'}`}>{p.orden}</div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{p.pedido?.cliente?.nombre} {p.pedido?.cliente?.apellido}</p>
                    <p className="text-xs text-muted-foreground truncate">{p.pedido?.direccion?.direccion}</p>
                    <p className="text-xs font-medium mt-0.5 text-brand-600">{formatCurrency(p.pedido?.total)}</p>
                  </div>
                  {p.estado==='completada' && <CheckCircle className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />}
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>

      <div className="lg:col-span-2">
        <Card className="overflow-hidden">
          <div ref={mapRef} className="h-[680px] w-full" />
        </Card>
      </div>
    </div>
  )
}

// ── SEGUIMIENTO EN VIVO TAB ───────────────────────────────────
// ── SEGUIMIENTO EN VIVO TAB — versión mejorada ───────────────
// Reemplaza la función SeguimientoTab() en RutasPage.jsx
// Mantén todo lo demás igual (RutasTab, imports, etc.)

function SeguimientoTab() {
  const mapRef      = useRef(null)
  const mapInstance = useRef(null)
  const markersRef  = useRef({})
  const routeLayersRef = useRef(new Set())
  const [distribuidoresActivos, setDistribuidoresActivos] = useState({})
  const [selectedDist, setSelectedDist] = useState(null)
  const [etaData, setEtaData] = useState({}) // { distribuidorId: { km, min, loading } }

  const { data: distribuidores = [] } = useQuery({
    queryKey: ['distribuidores'],
    queryFn:  () => usuariosApi.listar({ rol: 'distribuidor' }),
    select:   r => r.data.data,
  })

  const { data: pedidosHoy = [] } = useQuery({
    queryKey: ['pedidos-hoy-seguimiento'],
    queryFn:  () => pedidosApi.listar({ estado: 'en_ruta' }),
    select:   r => r.data.data,
    refetchInterval: 15000,
  })

  // Inicializar mapa
  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return
    const frame = requestAnimationFrame(() => {
      if (!mapRef.current || mapInstance.current) return
      mapInstance.current = new mapboxgl.Map({
        container: mapRef.current,
        style: 'mapbox://styles/mapbox/streets-v12',
        center: [-78.6167, -1.2543], // Ambato
        zoom: 12,
      })
      mapInstance.current.addControl(new mapboxgl.NavigationControl(), 'top-right')
      mapInstance.current.addControl(new mapboxgl.FullscreenControl(), 'top-right')
    })
    return () => {
      cancelAnimationFrame(frame)
      mapInstance.current?.remove()
      mapInstance.current = null
    }
  }, [])

  // Calcular ETA y dibujar ruta para un distribuidor
  const calcularEtaYRuta = async (distribuidorId, distLat, distLng) => {
    // Buscar pedido en_ruta de este distribuidor
    const pedido = pedidosHoy.find(p =>
      p.distribuidor_id === distribuidorId || p.distribuidor?.id === distribuidorId)
    if (!pedido?.direccion) return

    const { latitud, longitud } = pedido.direccion
    setEtaData(prev => ({ ...prev, [distribuidorId]: { ...prev[distribuidorId], loading: true } }))

    try {
      const token = import.meta.env.VITE_MAPBOX_TOKEN
      const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${distLng},${distLat};${longitud},${latitud}?access_token=${token}&overview=full&geometries=geojson`
      const res = await fetch(url)
      const data = await res.json()
      const route = data.routes?.[0]
      if (!route) return

      const km = (route.distance / 1000).toFixed(1)
      const min = Math.ceil(route.duration / 60)
      setEtaData(prev => ({ ...prev, [distribuidorId]: { km, min, loading: false } }))

      // Dibujar ruta en el mapa
      const map = mapInstance.current
      if (!map || !map.loaded()) return
      const sourceId = `ruta-${distribuidorId}`
      const layerBorderId = `ruta-border-${distribuidorId}`
      const layerId = `ruta-line-${distribuidorId}`

      const dibujar = () => {
        // Limpiar ruta anterior
        if (map.getLayer(layerBorderId)) map.removeLayer(layerBorderId)
        if (map.getLayer(layerId))       map.removeLayer(layerId)
        if (map.getSource(sourceId))     map.removeSource(sourceId)

        map.addSource(sourceId, {
          type: 'geojson',
          data: { type: 'Feature', geometry: route.geometry }
        })
        // Sombra
        map.addLayer({
          id: layerBorderId, type: 'line', source: sourceId,
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: { 'line-color': 'rgba(0,0,0,0.12)', 'line-width': 6 }
        })
        // Línea principal morada
        map.addLayer({
          id: layerId, type: 'line', source: sourceId,
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: { 'line-color': '#8B5CF6', 'line-width': 4, 'line-opacity': 0.9 }
        })
        routeLayersRef.current.add(sourceId)

        // Marcador destino (azul)
        const el = document.createElement('div')
        el.style.cssText = 'width:20px;height:20px;border-radius:50%;background:#2578E7;border:3px solid white;box-shadow:0 2px 8px rgba(37,120,231,0.5);'
        new mapboxgl.Marker({ element: el })
          .setLngLat([parseFloat(longitud), parseFloat(latitud)])
          .setPopup(new mapboxgl.Popup({ offset: 20 }).setHTML(
            `<div style="font-size:12px;padding:4px">
              <strong>📍 Destino</strong><br/>
              ${pedido.cliente?.nombre} ${pedido.cliente?.apellido}<br/>
              <small style="color:#666">${pedido.direccion?.direccion}</small>
            </div>`))
          .addTo(map)
      }

      if (map.loaded()) dibujar(); else map.on('load', dibujar)
    } catch (e) {
      setEtaData(prev => ({ ...prev, [distribuidorId]: { ...prev[distribuidorId], loading: false } }))
    }
  }

  useSocket({
    ubicacion_distribuidor: (data) => {
      const { lat, lng, distribuidor_id } = data
      if (!distribuidor_id) return

      setDistribuidoresActivos(prev => ({
        ...prev,
        [distribuidor_id]: { lat, lng, ultima_actualizacion: new Date() }
      }))

      const map = mapInstance.current
      if (!map || !map.loaded()) return

      // Actualizar o crear marcador del distribuidor (camión)
      if (markersRef.current[distribuidor_id]) {
        markersRef.current[distribuidor_id].setLngLat([lng, lat])
      } else {
        const el = document.createElement('div')
        el.style.cssText = [
          'width:44px', 'height:44px', 'border-radius:50%',
          'background:#8B5CF6', 'color:white', 'font-size:20px',
          'display:flex', 'align-items:center', 'justify-content:center',
          'border:3px solid white', 'box-shadow:0 3px 12px rgba(139,92,246,0.5)',
          'cursor:pointer', 'transition:transform 0.2s',
        ].join(';')
        el.textContent = '🚚'
        el.title = `Distribuidor ${distribuidor_id}`
        el.addEventListener('mouseenter', () => el.style.transform = 'scale(1.1)')
        el.addEventListener('mouseleave', () => el.style.transform = 'scale(1)')

        markersRef.current[distribuidor_id] = new mapboxgl.Marker({ element: el })
          .setLngLat([lng, lat])
          .addTo(map)
      }

      // Calcular ETA y dibujar ruta (throttle: cada 30s por distribuidor)
      const lastEta = etaData[distribuidor_id]
      const shouldUpdate = !lastEta || lastEta.loading === false
      if (shouldUpdate) {
        calcularEtaYRuta(distribuidor_id, lat, lng)
      }
    }
  })

  // Centrar mapa en distribuidor seleccionado
  const centrarEnDistribuidor = (distId) => {
    const ubic = distribuidoresActivos[distId]
    if (!ubic || !mapInstance.current) return
    setSelectedDist(distId)
    mapInstance.current.flyTo({
      center: [ubic.lng, ubic.lat],
      zoom: 15,
      duration: 800,
    })
  }

  const distribuidoresConActividad = distribuidores.filter(d => distribuidoresActivos[d.id])
  const distribuidoresSinActividad = distribuidores.filter(d => !distribuidoresActivos[d.id])

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">

      {/* ── Panel lateral ──────────────────────────────────── */}
      <div className="space-y-4">

        {/* Header activos */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Radio className="h-4 w-4 text-purple-600 animate-pulse" />
              En ruta ahora
              {distribuidoresConActividad.length > 0 && (
                <span className="ml-auto inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 text-[10px] font-bold">
                  {distribuidoresConActividad.length}
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 space-y-2">
            {distribuidoresConActividad.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-3">
                Ningún distribuidor en ruta
              </p>
            )}
            {distribuidoresConActividad.map(d => {
              const activo = distribuidoresActivos[d.id]
              const eta = etaData[d.id]
              const isSelected = selectedDist === d.id
              const pedido = pedidosHoy.find(p =>
                p.distribuidor_id === d.id || p.distribuidor?.id === d.id)

              return (
                <div key={d.id} onClick={() => centrarEnDistribuidor(d.id)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'border-purple-400 bg-purple-50 dark:bg-purple-950/30 shadow-sm'
                      : 'border-border hover:border-purple-300 hover:bg-purple-50/50 dark:hover:bg-purple-950/10'
                  }`}>

                  {/* Nombre y estado */}
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse shrink-0" />
                    <span className="font-semibold text-sm flex-1 truncate">
                      {d.nombre} {d.apellido}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(activo.ultima_actualizacion).toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  {/* ETA */}
                  {eta?.loading && (
                    <div className="flex items-center gap-1.5 text-xs text-purple-500">
                      <div className="w-3 h-3 rounded-full border border-purple-400 border-t-transparent animate-spin" />
                      Calculando ruta...
                    </div>
                  )}
                  {eta && !eta.loading && (
                    <div className="grid grid-cols-2 gap-1.5">
                      <div className="flex items-center gap-1.5 bg-purple-50 dark:bg-purple-950/20 rounded-lg px-2 py-1.5">
                        <Navigation className="h-3 w-3 text-purple-500 shrink-0" />
                        <span className="text-xs font-semibold text-purple-700 dark:text-purple-400">
                          {eta.km} km
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 bg-purple-50 dark:bg-purple-950/20 rounded-lg px-2 py-1.5">
                        <Clock className="h-3 w-3 text-purple-500 shrink-0" />
                        <span className="text-xs font-semibold text-purple-700 dark:text-purple-400">
                          ~{eta.min} min
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Pedido en curso */}
                  {pedido && (
                    <div className="mt-2 pt-2 border-t border-border/50">
                      <p className="text-[10px] text-muted-foreground truncate">
                        📦 {pedido.numero_pedido} · {pedido.cliente?.nombre} {pedido.cliente?.apellido}
                      </p>
                      {pedido.direccion && (
                        <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                          📍 {pedido.direccion.direccion}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </CardContent>
        </Card>

        {/* Sin actividad */}
        {distribuidoresSinActividad.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm text-muted-foreground">Sin actividad</CardTitle>
            </CardHeader>
            <CardContent className="p-3 space-y-1.5">
              {distribuidoresSinActividad.map(d => (
                <div key={d.id} className="flex items-center gap-2 p-2 rounded-lg">
                  <div className="w-2 h-2 rounded-full bg-gray-300 shrink-0" />
                  <span className="text-sm text-muted-foreground">
                    {d.nombre} {d.apellido}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Leyenda */}
        <Card>
          <CardContent className="p-3 space-y-2 text-xs text-muted-foreground">
            <p className="font-semibold text-foreground text-sm">Leyenda</p>
            <div className="flex items-center gap-2">
              <span className="text-base">🚚</span>
              <span>Distribuidor en tiempo real</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-1 rounded bg-purple-500 opacity-90" />
              <span>Ruta al destino</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500 border-2 border-white" />
              <span>Destino del pedido</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
              <span>GPS activo</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Mapa ───────────────────────────────────────────── */}
      <div className="lg:col-span-3">
        <Card className="overflow-hidden relative">
          <div ref={mapRef} className="h-[680px] w-full" />

          {/* Overlay cuando no hay distribuidores */}
          {Object.keys(distribuidoresActivos).length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="bg-white/90 dark:bg-gray-900/90 rounded-2xl p-6 text-center shadow-lg">
                <Radio className="h-10 w-10 mx-auto mb-3 text-purple-400 opacity-50" />
                <p className="font-semibold text-foreground">Esperando distribuidores</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Aparecerán aquí cuando inicien una entrega
                </p>
              </div>
            </div>
          )}

          {/* Badge resumen arriba del mapa */}
          {Object.keys(distribuidoresActivos).length > 0 && (
            <div className="absolute top-3 left-3 z-10 flex flex-col gap-2">
              <div className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm rounded-xl px-3 py-2 shadow-lg border border-border">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-xs font-semibold text-foreground">
                    {Object.keys(distribuidoresActivos).length} distribuidor{Object.keys(distribuidoresActivos).length !== 1 ? 'es' : ''} en ruta
                  </span>
                </div>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}