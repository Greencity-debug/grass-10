'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'

const MapWithDrawing = ({ onBack }) => {
  const mapRef = useRef(null)
  const [map, setMap] = useState(null)
  const [layers, setLayers] = useState([])
  const [isDrawing, setIsDrawing] = useState(false)
  const [currentPolygon, setCurrentPolygon] = useState(null)
  const [drawingPoints, setDrawingPoints] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [polygons, setPolygons] = useState([])
  const [mapMode, setMapMode] = useState('scheme')
  const [currentTileLayer, setCurrentTileLayer] = useState(null)
  const [showCreateLayerModal, setShowCreateLayerModal] = useState(false)
  const [showEditLayerModal, setShowEditLayerModal] = useState(false)
  const [editingLayer, setEditingLayer] = useState(null)
  const [layerVisibility, setLayerVisibility] = useState({})
  const [draggedLayer, setDraggedLayer] = useState(null)
  const [polygonData, setPolygonData] = useState({
    name: '',
    description: '',
    layerId: ''
  })
  const [newLayerData, setNewLayerData] = useState({
    name: '',
    color: '#4CAF50'
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
    const timer = setTimeout(() => {
      if (typeof window !== 'undefined' && mapRef.current && !map) {
        initializeMap()
      }
    }, 100)
    return () => clearTimeout(timer)
  }, [])

  const initializeMap = () => {
    const L = require('leaflet')
    
    if (mapRef.current) {
      mapRef.current.innerHTML = ''
      if (mapRef.current._leaflet_id) {
        delete mapRef.current._leaflet_id
      }
    }
    
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
      
      const tileLayer = L.tileLayer('https://core-renderer-tiles.maps.yandex.net/tiles?l=map&v=21.06.03-0&x={x}&y={y}&z={z}&scale=1&lang=ru_RU', {
        attribution: '© Яндекс',
        maxZoom: 19
      }).addTo(mapInstance)

      setCurrentTileLayer(tileLayer)
      mapInstance.on('click', handleMapClick)
      setMap(mapInstance)

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

  useEffect(() => {
    updatePolygonVisibility()
  }, [layerVisibility, polygons])

  const switchMapMode = (mode) => {
    if (!map || !currentTileLayer) return
    
    const L = require('leaflet')
    map.removeLayer(currentTileLayer)
    
    let newTileLayer
    
    switch (mode) {
      case 'scheme':
        newTileLayer = L.tileLayer('https://core-renderer-tiles.maps.yandex.net/tiles?l=map&v=21.06.03-0&x={x}&y={y}&z={z}&scale=1&lang=ru_RU', {
          attribution: '© Яндекс',
          maxZoom: 19
        })
        break
      case 'satellite':
        newTileLayer = L.tileLayer('https://core-sat.maps.yandex.net/tiles?l=sat&v=3.1072.0&x={x}&y={y}&z={z}&scale=1&lang=ru_RU', {
          attribution: '© Яндекс',
          maxZoom: 19
        })
        break
      case 'hybrid':
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
    try {
      const { data, error } = await supabase
        .from('layers')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (error) {
        console.error('🚨 Ошибка загрузки слоёв:', error)
        return
      }
      
      if (data) {
        setLayers(data)
        
        const visibility = {}
        data.forEach(layer => {
          visibility[layer.id] = true
        })
        setLayerVisibility(visibility)
      }
    } catch (err) {
      console.error('💥 Критическая ошибка:', err)
    }
  }

  // Функции для drag & drop слоёв
  const handleDragStart = (e, layer) => {
    setDraggedLayer(layer)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = (e, targetLayer) => {
    e.preventDefault()
    
    if (!draggedLayer || draggedLayer.id === targetLayer.id) {
      setDraggedLayer(null)
      return
    }

    const newLayers = [...layers]
    const draggedIndex = newLayers.findIndex(l => l.id === draggedLayer.id)
    const targetIndex = newLayers.findIndex(l => l.id === targetLayer.id)
    
    // Переставляем элементы
    newLayers.splice(draggedIndex, 1)
    newLayers.splice(targetIndex, 0, draggedLayer)
    
    setLayers(newLayers)
    setDraggedLayer(null)
  }

  const handleMapClick = (e) => {
    if (!isDrawing) return

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
      color: '#2196F3',
      fillColor: '#2196F3',
      fillOpacity: 0.3,
      weight: 2
    }).addTo(map)

    setCurrentPolygon(polygon)
  }

  const updatePolygonVisibility = () => {
    if (!map || !polygons.length) return

    polygons.forEach(polygon => {
      if (polygon.leafletLayer) {
        const isVisible = layerVisibility[polygon.layer_id]
        if (isVisible && !map.hasLayer(polygon.leafletLayer)) {
          map.addLayer(polygon.leafletLayer)
        } else if (!isVisible && map.hasLayer(polygon.leafletLayer)) {
          map.removeLayer(polygon.leafletLayer)
        }
      }
    })
  }

  const startDrawing = () => {
    if (layers.length === 0) {
      alert('Создайте хотя бы один слой для рисования')
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

    if (!polygonData.layerId) {
      alert('Выберите слой для полигона')
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
        layer_id: polygonData.layerId,
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
          }).bindPopup(`
            <strong>${polygon.name}</strong><br>
            ${polygon.description || ''}<br>
            Площадь: ${polygon.square ? (polygon.square / 10000).toFixed(2) + ' га' : 'не рассчитана'}
          `)

          if (layerVisibility[polygon.layer_id] !== false) {
            leafletLayer.addTo(map)
          }

          return { ...polygon, leafletLayer }
        }
        return polygon
      })

      setPolygons(newPolygons)
    }
  }

  const createLayer = () => {
    setShowCreateLayerModal(true)
  }

  const saveNewLayer = async () => {
    if (!newLayerData.name.trim()) {
      alert('Введите название слоя')
      return
    }

    const { data, error } = await supabase
      .from('layers')
      .insert({
        name: newLayerData.name,
        color: newLayerData.color
      })

    if (error) {
      console.error('Ошибка создания слоя:', error)
      alert('Ошибка создания слоя')
    } else {
      alert('Слой успешно создан')
      setShowCreateLayerModal(false)
      setNewLayerData({ name: '', color: '#4CAF50' })
      loadLayers()
    }
  }

  const editLayer = (layer) => {
    setEditingLayer(layer)
    setNewLayerData({ name: layer.name, color: layer.color })
    setShowEditLayerModal(true)
  }

  const saveEditedLayer = async () => {
    if (!newLayerData.name.trim()) {
      alert('Введите название слоя')
      return
    }

    const { data, error } = await supabase
      .from('layers')
      .update({
        name: newLayerData.name,
        color: newLayerData.color
      })
      .eq('id', editingLayer.id)

    if (error) {
      console.error('Ошибка редактирования слоя:', error)
      alert('Ошибка редактирования слоя')
    } else {
      alert('Слой успешно обновлён')
      setShowEditLayerModal(false)
      setEditingLayer(null)
      setNewLayerData({ name: '', color: '#4CAF50' })
      loadLayers()
      loadPolygons()
    }
  }

  const deleteLayer = async (layer) => {
    if (!confirm(`Удалить слой "${layer.name}"? Все полигоны этого слоя тоже будут удалены.`)) {
      return
    }

    const { error } = await supabase
      .from('layers')
      .delete()
      .eq('id', layer.id)

    if (error) {
      console.error('Ошибка удаления слоя:', error)
      alert('Ошибка удаления слоя')
    } else {
      alert('Слой успешно удалён')
      loadLayers()
      loadPolygons()
    }
  }

  const toggleLayerVisibility = (layerId) => {
    setLayerVisibility(prev => ({
      ...prev,
      [layerId]: !prev[layerId]
    }))
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
        {/* КОМПАКТНАЯ ШАПКА */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
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
            margin: '10px 0'
          }}></div>
        </div>


        {/* КОМПАКТНЫЕ СЛОИ */}
        <div style={{ flex: 1 }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: '10px'
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
            {layers.map((layer, index) => (
              <div
                key={layer.id} 
                draggable
                onDragStart={(e) => handleDragStart(e, layer)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, layer)}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center',
                  fontSize: '14px',
                  padding: '8px',
                  borderRadius: '4px',
                  backgroundColor: 'transparent',
                  border: '1px solid transparent',
                  cursor: 'grab'
                }}
              >
                {/* Иконка перетаскивания */}
                <div style={{ 
                  marginRight: '6px', 
                  color: '#ccc',
                  fontSize: '12px',
                  cursor: 'grab'
                }}>
                  ⋮⋮
                </div>

                <button
                  onClick={() => deleteLayer(layer)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '2px',
                    marginRight: '6px',
                    color: '#666'
                  }}
                  title="Удалить слой"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                  </svg>
                </button>

                <button
                  onClick={() => editLayer(layer)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '2px',
                    marginRight: '8px',
                    color: '#666'
                  }}
                  title="Редактировать слой"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                  </svg>
                </button>

                <div 
                  style={{
                    width: '12px',
                    height: '12px',
                    backgroundColor: layer.color,
                    borderRadius: '2px',
                    marginRight: '8px'
                  }}
                ></div>

                <span style={{ flex: 1, color: '#333' }}>{layer.name}</span>

                {/* Switch видимости */}
                <label style={{ 
                  position: 'relative', 
                  display: 'inline-block', 
                  width: '32px', 
                  height: '18px',
                  cursor: 'pointer'
                }}>
                  <input
                    type="checkbox"
                    checked={layerVisibility[layer.id] !== false}
                    onChange={() => toggleLayerVisibility(layer.id)}
                    style={{ display: 'none' }}
                  />
                  <span style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: layerVisibility[layer.id] !== false ? '#4A5D23' : '#ccc',
                    borderRadius: '18px',
                    transition: 'all 0.2s'
                  }}>
                    <span style={{
                      position: 'absolute',
                      content: '',
                      height: '14px',
                      width: '14px',
                      left: layerVisibility[layer.id] !== false ? '16px' : '2px',
                      bottom: '2px',
                      backgroundColor: 'white',
                      borderRadius: '50%',
                      transition: 'all 0.2s'
                    }}></span>
                  </span>
                </label>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ 
        flex: 1, 
        height: '100vh', 
        position: 'relative',
        overflow: 'hidden'
      }}>
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

      {/* Все модальные окна остаются такими же... */}
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
            <h3 style={{ margin: '0 0 20px 0' }}>Карточка полигона</h3>
            
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
                Слой*:
              </label>
              <select 
                value={polygonData.layerId || ''}
                onChange={(e) => setPolygonData({...polygonData, layerId: e.target.value})}
                style={{ 
                  width: '100%', 
                  padding: '8px', 
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
              >
                <option value="">Выберите слой...</option>
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

      {showCreateLayerModal && (
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
            <h3 style={{ margin: '0 0 20px 0' }}>Создание нового слоя</h3>
            
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                Название слоя*:
              </label>
              <input
                type="text"
                value={newLayerData.name}
                onChange={(e) => setNewLayerData({...newLayerData, name: e.target.value})}
                style={{ 
                  width: '100%', 
                  padding: '8px', 
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
                placeholder="Введите название слоя"
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                Цвет:
              </label>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <input
                  type="color"
                  value={newLayerData.color}
                  onChange={(e) => setNewLayerData({...newLayerData, color: e.target.value})}
                  style={{ 
                    width: '50px', 
                    height: '35px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                />
                <input
                  type="text"
                  value={newLayerData.color}
                  onChange={(e) => setNewLayerData({...newLayerData, color: e.target.value})}
                  style={{ 
                    flex: 1,
                    padding: '8px', 
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '14px'
                  }}
                  placeholder="#4CAF50"
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button 
                onClick={saveNewLayer}
                style={{
                  flex: 1,
                  padding: '10px',
                  backgroundColor: '#4A5D23',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Создать
              </button>
              <button 
                onClick={() => {
                  setShowCreateLayerModal(false)
                  setNewLayerData({ name: '', color: '#4CAF50' })
                }}
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

      {showEditLayerModal && (
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
            <h3 style={{ margin: '0 0 20px 0' }}>Редактирование слоя</h3>
            
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                Название слоя*:
              </label>
              <input
                type="text"
                value={newLayerData.name}
                onChange={(e) => setNewLayerData({...newLayerData, name: e.target.value})}
                style={{ 
                  width: '100%', 
                  padding: '8px', 
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
                placeholder="Введите название слоя"
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                Цвет:
              </label>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <input
                  type="color"
                  value={newLayerData.color}
                  onChange={(e) => setNewLayerData({...newLayerData, color: e.target.value})}
                  style={{ 
                    width: '50px', 
                    height: '35px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                />
                <input
                  type="text"
                  value={newLayerData.color}
                  onChange={(e) => setNewLayerData({...newLayerData, color: e.target.value})}
                  style={{ 
                    flex: 1,
                    padding: '8px', 
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '14px'
                  }}
                  placeholder="#4CAF50"
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button 
                onClick={saveEditedLayer}
                style={{
                  flex: 1,
                  padding: '10px',
                  backgroundColor: '#4A5D23',
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
                onClick={() => {
                  setShowEditLayerModal(false)
                  setEditingLayer(null)
                  setNewLayerData({ name: '', color: '#4CAF50' })
                }}
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
