'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'

const MapWithDrawing = () => {
  const mapRef = useRef(null)
  const [map, setMap] = useState(null)
  const [layers, setLayers] = useState([])
  const [selectedLayer, setSelectedLayer] = useState(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [currentPolygon, setCurrentPolygon] = useState(null)
  const [drawingPoints, setDrawingPoints] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [polygons, setPolygons] = useState([])
  const [polygonData, setPolygonData] = useState({
    name: '',
    description: '',
    layerId: ''
  })

  useEffect(() => {
    loadLayers()
    
    // Очистка при размонтировании компонента
    return () => {
      if (map) {
        map.remove()
        setMap(null)
      }
    }
  }, [])

  useEffect(() => {
    if (typeof window !== 'undefined' && mapRef.current && !map) {
      const L = require('leaflet')
      
      // Очищаем контейнер карты если он уже инициализирован
      if (mapRef.current._leaflet_id) {
        mapRef.current._leaflet_id = null
      }
      
      delete L.Icon.Default.prototype._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
      })
      
      try {
        const mapInstance = L.map(mapRef.current).setView([55.7558, 37.6176], 10)
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors'
        }).addTo(mapInstance)

        mapInstance.on('click', handleMapClick)
        setMap(mapInstance)
      } catch (error) {
        console.error('Ошибка инициализации карты:', error)
        // Если карта уже инициализирована, очищаем и пробуем снова
        if (mapRef.current) {
          mapRef.current.innerHTML = ''
          const mapInstance = L.map(mapRef.current).setView([55.7558, 37.6176], 10)
          
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
          }).addTo(mapInstance)

          mapInstance.on('click', handleMapClick)
          setMap(mapInstance)
        }
      }
    }
  }, [])

  useEffect(() => {
    if (map) {
      loadPolygons()
    }
  }, [map])

  const loadLayers = async () => {
    const { data, error } = await supabase
      .from('layers')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (data) {
      setLayers(data)
      if (data.length > 0 && !selectedLayer) {
        setSelectedLayer(data[0])
      }
    }
  }

  const handleMapClick = (e) => {
    if (!isDrawing || !selectedLayer) return

    const point = [e.latlng.lat, e.latlng.lng]
    const newPoints = [...drawingPoints, point]
    
    if (drawingPoints.length > 2) {
      const firstPoint = drawingPoints[0]
      const distance = Math.sqrt(
        Math.pow(e.latlng.lat - firstPoint[0], 2) + 
        Math.pow(e.latlng.lng - firstPoint[1], 2)
      )
      
      if (distance < 0.001) {
        finishDrawing()
        return
      }
    }

    setDrawingPoints(newPoints)
    updateCurrentPolygon(newPoints)
  }

  const updateCurrentPolygon = (points) => {
    if (!map || points.length < 2) return

    const L = require('leaflet')
    
    if (currentPolygon) {
      map.removeLayer(currentPolygon)
    }

    const polygon = L.polygon(points, {
      color: selectedLayer?.color || '#4CAF50',
      fillColor: selectedLayer?.color || '#4CAF50',
      fillOpacity: 0.3,
      weight: 2
    }).addTo(map)

    setCurrentPolygon(polygon)
  }

  const startDrawing = () => {
    if (!selectedLayer) {
      alert('Выберите слой для рисования')
      return
    }
    setIsDrawing(true)
    setDrawingPoints([])
    if (currentPolygon) {
      map.removeLayer(currentPolygon)
      setCurrentPolygon(null)
    }
  }

  const cancelDrawing = () => {
    setIsDrawing(false)
    setDrawingPoints([])
    if (currentPolygon) {
      map.removeLayer(currentPolygon)
      setCurrentPolygon(null)
    }
  }

  const finishDrawing = () => {
    if (drawingPoints.length < 3) {
      alert('Полигон должен содержать минимум 3 точки')
      return
    }
    
    setIsDrawing(false)
    setShowModal(true)
  }

  const savePolygon = async () => {
    if (!polygonData.name.trim()) {
      alert('Введите название полигона')
      return
    }

    const closedPoints = [...drawingPoints, drawingPoints[0]]
    
    const geoJson = {
      type: 'Polygon',
      coordinates: [closedPoints.map(point => [point[1], point[0]])]
    }

    const { data, error } = await supabase
      .from('polygons')
      .insert({
        name: polygonData.name,
        description: polygonData.description,
        layer_id: polygonData.layerId || selectedLayer.id,
        geometry: geoJson
      })

    if (error) {
      console.error('Ошибка сохранения полигона:', error)
      alert('Ошибка сохранения полигона')
    } else {
      alert('Полигон успешно сохранен')
      setShowModal(false)
      setPolygonData({ name: '', description: '', layerId: '' })
      setDrawingPoints([])
      if (currentPolygon) {
        map.removeLayer(currentPolygon)
        setCurrentPolygon(null)
      }
      loadPolygons()
    }
  }

  const loadPolygons = async () => {
    const { data, error } = await supabase
      .from('polygons')
      .select(`
        *,
        layers (name, color)
      `)
    
    if (data && map) {
      polygons.forEach(polygon => {
        if (polygon.leafletLayer) {
          map.removeLayer(polygon.leafletLayer)
        }
      })

      const L = require('leaflet')
      const newPolygons = data.map(polygon => {
        if (polygon.geometry && polygon.geometry.coordinates) {
          const coords = polygon.geometry.coordinates[0].map(coord => [coord[1], coord[0]])
          
          const leafletLayer = L.polygon(coords, {
            color: polygon.layers?.color || '#4CAF50',
            fillColor: polygon.layers?.color || '#4CAF50',
            fillOpacity: 0.3,
            weight: 2
          }).addTo(map).bindPopup(`
            <strong>${polygon.name}</strong><br>
            ${polygon.description || ''}<br>
            Площадь: ${polygon.square ? (polygon.square / 10000).toFixed(2) + ' га' : 'не рассчитана'}
          `)

          return { ...polygon, leafletLayer }
        }
        return polygon
      })

      setPolygons(newPolygons)
    }
  }

  const createLayer = async () => {
    const name = prompt('Введите название нового слоя:')
    if (!name) return

    const colors = ['#4CAF50', '#2196F3', '#FF9800', '#F44336', '#9C27B0', '#607D8B']
    const randomColor = colors[Math.floor(Math.random() * colors.length)]

    const { data, error } = await supabase
      .from('layers')
      .insert({ 
        name,
        color: randomColor
      })

    if (!error) {
      loadLayers()
    }
  }

  return (
    <div style={{ height: '100vh', position: 'relative' }}>
      <div style={{
        position: 'absolute',
        top: '10px',
        left: '10px',
        zIndex: 1000,
        background: 'white',
        padding: '15px',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        minWidth: '250px'
      }}>
        <h3 style={{ margin: '0 0 15px 0', fontSize: '16px' }}>Инструменты</h3>
        
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>Слой:</label>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <select 
              value={selectedLayer?.id || ''} 
              onChange={(e) => setSelectedLayer(layers.find(l => l.id == e.target.value))}
              style={{
                flex: 1,
                padding: '5px',
                border: '1px solid #ddd',
                borderRadius: '4px'
              }}
            >
              <option value="">Выберите слой</option>
              {layers.map(layer => (
                <option key={layer.id} value={layer.id}>{layer.name}</option>
              ))}
            </select>
            <button 
              onClick={createLayer}
              style={{
                marginLeft: '5px',
                padding: '5px 10px',
                backgroundColor: '#4CAF50',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              +
            </button>
          </div>
        </div>
        
        <div style={{ marginBottom: '15px' }}>
          {!isDrawing ? (
            <button 
              onClick={startDrawing}
              disabled={!selectedLayer}
              style={{
                width: '100%',
                padding: '8px 15px',
                backgroundColor: selectedLayer ? '#4CAF50' : '#ccc',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: selectedLayer ? 'pointer' : 'not-allowed'
              }}
            >
              Начать рисование
            </button>
          ) : (
            <div style={{ display: 'flex', gap: '5px' }}>
              <button 
                onClick={finishDrawing}
                style={{
                  flex: 1,
                  padding: '8px',
                  backgroundColor: '#2196F3',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Завершить
              </button>
              <button 
                onClick={cancelDrawing}
                style={{
                  flex: 1,
                  padding: '8px',
                  backgroundColor: '#f44336',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Отмена
              </button>
            </div>
          )}
        </div>
        
        {isDrawing && (
          <div style={{ 
            fontSize: '12px', 
            color: '#666',
            background: '#f5f5f5',
            padding: '8px',
            borderRadius: '4px'
          }}>
            <div>Точек: {drawingPoints.length}</div>
            <div style={{ marginTop: '4px' }}>
              {drawingPoints.length < 3 
                ? 'Минимум 3 точки для создания полигона'
                : 'Кликните в начальную точку для завершения'
              }
            </div>
          </div>
        )}
      </div>

      <div ref={mapRef} style={{ height: '100%', width: '100%' }} />

      {showModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 2000
        }}>
          <div style={{
            background: 'white',
            padding: '25px',
            borderRadius: '12px',
            minWidth: '400px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)'
          }}>
            <h3 style={{ margin: '0 0 20px 0' }}>Сохранение полигона</h3>
            
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                Название*:
              </label>
              <input
                type="text"
                value={polygonData.name}
                onChange={(e) => setPolygonData({...polygonData, name: e.target.value})}
                style={{ 
                  width: '100%', 
                  padding: '8px', 
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
                placeholder="Введите название полигона"
              />
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                Описание:
              </label>
              <textarea
                value={polygonData.description}
                onChange={(e) => setPolygonData({...polygonData, description: e.target.value})}
                style={{ 
                  width: '100%', 
                  padding: '8px', 
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px',
                  height: '80px',
                  resize: 'vertical'
                }}
                placeholder="Дополнительное описание (необязательно)"
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                Слой:
              </label>
              <select 
                value={polygonData.layerId || selectedLayer?.id || ''}
                onChange={(e) => setPolygonData({...polygonData, layerId: e.target.value})}
                style={{ 
                  width: '100%', 
                  padding: '8px', 
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
              >
                {layers.map(layer => (
                  <option key={layer.id} value={layer.id}>{layer.name}</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button 
                onClick={savePolygon}
                style={{
                  flex: 1,
                  padding: '10px',
                  backgroundColor: '#4CAF50',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Сохранить
              </button>
              <button 
                onClick={() => setShowModal(false)}
                style={{
                  flex: 1,
                  padding: '10px',
                  backgroundColor: '#757575',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default MapWithDrawing
