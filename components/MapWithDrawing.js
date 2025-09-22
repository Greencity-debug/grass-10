'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'

const MapWithDrawing = ({ onBack }) => {
  const mapRef = useRef(null)
  const [map, setMap] = useState(null)
  const [layers, setLayers] = useState([])
  const [selectedLayer, setSelectedLayer] = useState(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [currentPolygon, setCurrentPolygon] = useState(null)
  const [drawingPoints, setDrawingPoints] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [polygons, setPolygons] = useState([])
  const [mapMode, setMapMode] = useState('scheme')
  const [currentTileLayer, setCurrentTileLayer] = useState(null)
  const [polygonData, setPolygonData] = useState({
    name: '',
    description: '',
    layerId: ''
  })

  useEffect(() => {
    loadLayers()
    return () => {
      if (map) {
        map.remove()
        setMap(null)
      }
    }
  }, [])

  useEffect(() => {
    // Добавляем небольшую задержку для полной загрузки DOM
    const timer = setTimeout(() => {
      if (typeof window !== 'undefined' && mapRef.current && !map) {
        initializeMap()
      }
    }, 100)

    return () => clearTimeout(timer)
  }, [])

  const initializeMap = () => {
    const L = require('leaflet')
    
    // Убираем все существующие карты из элемента
    if (mapRef.current) {
      mapRef.current.innerHTML = ''
      if (mapRef.current._leaflet_id) {
        delete mapRef.current._leaflet_id
      }
    }
    
    // Исправляем иконки Leaflet
    delete L.Icon.Default.prototype._getIconUrl
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
      iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
    })
    
    try {
      const mapInstance = L.map(mapRef.current, {
        center: [55.709362, 52.308385],
        zoom: 15,
        zoomControl: true,
        dragging: true,
        touchZoom: true,
        doubleClickZoom: true,
        scrollWheelZoom: true,
        boxZoom: true,
        keyboard: true,
        attributionControl: true
      })
      
      // Используем Яндекс.Карты как источник по умолчанию (схема)
      const tileLayer = L.tileLayer('https://core-renderer-tiles.maps.yandex.net/tiles?l=map&v=21.06.03-0&x={x}&y={y}&z={z}&scale=1&lang=ru_RU', {
        attribution: '© Яндекс',
        maxZoom: 19
      }).addTo(mapInstance)

      setCurrentTileLayer(tileLayer)
      mapInstance.on('click', handleMapClick)
      setMap(mapInstance)

      // Принудительно обновляем размеры карты несколько раз
      setTimeout(() => mapInstance.invalidateSize(), 100)
      setTimeout(() => mapInstance.invalidateSize(), 300)
      setTimeout(() => mapInstance.invalidateSize(), 1000)
      
    } catch (error) {
      console.error('Ошибка инициализации карты:', error)
    }
  }

  useEffect(() => {
    if (map) {
      loadPolygons()
    }
  }, [map])

  const switchMapMode = (mode) => {
    if (!map || !currentTileLayer) return
    
    const L = require('leaflet')
    map.removeLayer(currentTileLayer)
    
    let newTileLayer
    
    switch (mode) {
      case 'scheme':
        // Яндекс.Карты - схема
        newTileLayer = L.tileLayer('https://core-renderer-tiles.maps.yandex.net/tiles?l=map&v=21.06.03-0&x={x}&y={y}&z={z}&scale=1&lang=ru_RU', {
          attribution: '© Яндекс',
          maxZoom: 19
        })
        break
      case 'satellite':
        // Яндекс.Карты - спутник
        newTileLayer = L.tileLayer('https://core-sat.maps.yandex.net/tiles?l=sat&v=3.1072.0&x={x}&y={y}&z={z}&scale=1&lang=ru_RU', {
          attribution: '© Яндекс',
          maxZoom: 19
        })
        break
      case 'hybrid':
        // Яндекс.Карты - гибрид (спутник + схема)
        newTileLayer = L.layerGroup([
          L.tileLayer('https://core-sat.maps.yandex.net/tiles?l=sat&v=3.1072.0&x={x}&y={y}&z={z}&scale=1&lang=ru_RU', {
            attribution: '© Яндекс',
            maxZoom: 19
          }),
          L.tileLayer('https://core-renderer-tiles.maps.yandex.net/tiles?l=skl&v=21.06.03-0&x={x}&y={y}&z={z}&scale=1&lang=ru_RU', {
            maxZoom: 19,
            opacity: 0.8
          })
        ])
        break
      default:
        newTileLayer = L.tileLayer('https://core-renderer-tiles.maps.yandex.net/tiles?l=map&v=21.06.03-0&x={x}&y={y}&z={z}&scale=1&lang=ru_RU', {
          attribution: '© Яндекс',
          maxZoom: 19
        })
    }
    
    newTileLayer.addTo(map)
    setCurrentTileLayer(newTileLayer)
    setMapMode(mode)
  }

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
      .select(`*, layers (name, color)`)
    
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
      .insert({ name, color: randomColor })

    if (!error) {
      loadLayers()
    }
  }

  const handleBackClick = () => {
    if (onBack && typeof onBack === 'function') {
      onBack()
    } else {
      window.history.back()
    }
  }

  return (
    <div style={{ height: '100vh', display: 'flex', overflow: 'hidden' }}>
      <div style={{
        width: '300px',
        height: '100vh',
        background: 'white',
        borderRight: '1px solid #e0e0e0',
        display: 'flex',
        flexDirection: 'column',
        padding: '20px',
        zIndex: 1000
      }}>
        <div style={{ marginBottom: '30px' }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
            {/* iOS-стиль стрелка назад - уменьшенная и светло-серая */}
            <button 
              onClick={handleBackClick}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '16px',
                cursor: 'pointer',
                padding: '8px',
                marginRight: '8px',
                color: '#999',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '6px',
                transition: 'background-color 0.2s'
              }}
              onMouseOver={(e) => e.target.style.backgroundColor = '#f0f0f0'}
              onMouseOut={(e) => e.target.style.backgroundColor = 'transparent'}
            >
              <svg width="8" height="14" viewBox="0 0 12 20" fill="currentColor">
                <path d="M11.67 2.17L10.25 0.75L0.75 10.25L10.25 19.75L11.67 18.33L3.58 10.25L11.67 2.17Z"/>
              </svg>
            </button>
            
            <div style={{ display: 'flex', alignItems: 'baseline' }}>
              <h1 style={{ 
                fontSize: '24px', 
                margin: '0',
                color: '#4A5D23'
              }}>
                Grasscutter
              </h1>
              <span style={{
                fontSize: '12px',
                color: '#999',
                marginLeft: '8px',
                fontWeight: '400'
              }}>
                1.0
              </span>
            </div>
          </div>
          <div style={{ 
            height: '1px', 
            background: '#e0e0e0',
            margin: '15px 0'
          }}></div>
        </div>

        <div style={{ marginBottom: '30px', flex: 1 }}>
          <h3 style={{ 
            fontSize: '16px',
            color: '#333',
            marginBottom: '15px',
            fontWeight: '600'
          }}>
            Инструменты
          </h3>
          
          {/* Новые кнопки в одну строку */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between',
            gap: '8px',
            marginBottom: '15px'
          }}>
            {/* Удалить */}
            <button 
              disabled
              style={{ 
                flex: 1,
                display: 'flex', 
                flexDirection: 'column',
                alignItems: 'center',
                padding: '12px 8px',
                borderRadius: '8px',
                backgroundColor: '#f5f5f5',
                border: '1px solid #e0e0e0',
                cursor: 'not-allowed',
                minHeight: '60px'
              }}
            >
              {/* Иконка удаления в стиле Material 3 */}
              <svg width="20" height="20" viewBox="0 0 24 24" fill="#aaa" style={{ marginBottom: '4px' }}>
                <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
              </svg>
              <span style={{ fontSize: '10px', color: '#aaa' }}>Удалить</span>
            </button>

            {/* Изменить */}
            <button 
              disabled
              style={{ 
                flex: 1,
                display: 'flex', 
                flexDirection: 'column',
                alignItems: 'center',
                padding: '12px 8px',
                borderRadius: '8px',
                backgroundColor: '#f5f5f5',
                border: '1px solid #e0e0e0',
                cursor: 'not-allowed',
                minHeight: '60px'
              }}
            >
              {/* Иконка редактирования в стиле Material 3 */}
              <svg width="20" height="20" viewBox="0 0 24 24" fill="#aaa" style={{ marginBottom: '4px' }}>
                <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
              </svg>
              <span style={{ fontSize: '10px', color: '#aaa' }}>Изменить</span>
            </button>

            {/* Добавить */}
            <button 
              onClick={isDrawing ? cancelDrawing : startDrawing}
              style={{ 
                flex: 1,
                display: 'flex', 
                flexDirection: 'column',
                alignItems: 'center',
                padding: '12px 8px',
                borderRadius: '8px',
                backgroundColor: isDrawing ? '#e3f2fd' : '#f9f9f9',
                border: isDrawing ? '2px solid #2196F3' : '1px solid #e0e0e0',
                cursor: 'pointer',
                minHeight: '60px',
                transition: 'all 0.2s'
              }}
            >
              {/* Иконка добавления в стиле Material 3 */}
              <svg width="20" height="20" viewBox="0 0 24 24" fill={isDrawing ? '#2196F3' : '#333'} style={{ marginBottom: '4px' }}>
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11h-4v4h-2v-4H7v-2h4V7h2v4h4v2z"/>
              </svg>
              <span style={{ fontSize: '10px', color: isDrawing ? '#2196F3' : '#333' }}>Добавить</span>
            </button>
          </div>

          {/* Кнопки управления рисованием */}
          {isDrawing && (
            <div style={{ marginTop: '20px' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button 
                  onClick={finishDrawing}
                  style={{
                    flex: 1,
                    padding: '8px',
                    backgroundColor: '#2196F3',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '12px'
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
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}
                >
                  Отмена
                </button>
              </div>
              
              <div style={{ 
                fontSize: '11px', 
                color: '#666',
                background: '#f5f5f5',
                padding: '8px',
                borderRadius: '4px',
                marginTop: '8px'
              }}>
                <div>Точек: {drawingPoints.length}</div>
                <div style={{ marginTop: '4px' }}>
                  {drawingPoints.length < 3 
                    ? 'Минимум 3 точки для создания полигона'
                    : 'Кликните в начальную точку для завершения'
                  }
                </div>
              </div>
            </div>
          )}
        </div>

        <div style={{ 
          height: '1px', 
          background: '#e0e0e0',
          margin: '20px 0'
        }}></div>

        <div>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: '15px'
          }}>
            <h3 style={{ 
              fontSize: '16px',
              color: '#333',
              margin: '0',
              fontWeight: '600'
            }}>
              Слои
            </h3>
            <button 
              onClick={createLayer}
              style={{
                background: '#4A5D23',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                width: '24px',
                height: '24px',
                cursor: 'pointer',
                fontSize: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              +
            </button>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {layers.map(layer => (
              <label 
                key={layer.id} 
                style={{ 
                  display: 'flex', 
                  alignItems: 'center',
                  fontSize: '14px',
                  color: '#333',
                  cursor: 'pointer',
                  padding: '6px',
                  borderRadius: '4px',
                  backgroundColor: selectedLayer?.id === layer.id ? '#f0f8f0' : 'transparent'
                }}
              >
                <input 
                  type="radio"
                  name="selectedLayer"
                  checked={selectedLayer?.id === layer.id}
                  onChange={() => setSelectedLayer(layer)}
                  style={{ marginRight: '8px' }}
                />
                <div 
                  style={{
                    width: '12px',
                    height: '12px',
                    backgroundColor: layer.color,
                    borderRadius: '2px',
                    marginRight: '8px'
                  }}
                ></div>
                {layer.name}
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* Контейнер карты с явным позиционированием */}
      <div style={{ 
        flex: 1, 
        height: '100vh', 
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Кнопки переключения режима карты */}
        <div style={{
          position: 'absolute',
          top: '15px',
          right: '15px',
          zIndex: 1000,
          display: 'flex',
          backgroundColor: 'white',
          borderRadius: '6px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          overflow: 'hidden'
        }}>
          <button
            onClick={() => switchMapMode('scheme')}
            style={{
              padding: '8px 12px',
              border: 'none',
              backgroundColor: mapMode === 'scheme' ? '#4A5D23' : 'white',
              color: mapMode === 'scheme' ? 'white' : '#333',
              fontSize: '12px',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            Схема
          </button>
          <button
            onClick={() => switchMapMode('satellite')}
            style={{
              padding: '8px 12px',
              border: 'none',
              borderLeft: '1px solid #e0e0e0',
              backgroundColor: mapMode === 'satellite' ? '#4A5D23' : 'white',
              color: mapMode === 'satellite' ? 'white' : '#333',
              fontSize: '12px',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            Спутник
          </button>
          <button
            onClick={() => switchMapMode('hybrid')}
            style={{
              padding: '8px 12px',
              border: 'none',
              borderLeft: '1px solid #e0e0e0',
              backgroundColor: mapMode === 'hybrid' ? '#4A5D23' : 'white',
              color: mapMode === 'hybrid' ? 'white' : '#333',
              fontSize: '12px',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            Гибрид
          </button>
        </div>
        
        {/* Контейнер карты с фиксированными размерами */}
        <div 
          ref={mapRef} 
          style={{ 
            height: '100%', 
            width: '100%',
            position: 'absolute',
            top: 0,
            left: 0
          }} 
        />
      </div>

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
