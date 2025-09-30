'use client'

import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import ObjectModal from './ObjectModal';
import { MapContainer, TileLayer, FeatureGroup, Marker, Popup, Polyline, Polygon, useMap } from 'react-leaflet';
import { EditControl } from 'react-leaflet-draw';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';
import L from 'leaflet';

// Fix for default icon issue with webpack
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Helper function to create colored SVG markers
const createColoredMarkerIcon = (color) => {
    const markerHtml = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="28px" height="28px" fill="${color}">
        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 010-5 2.5 2.5 0 010 5z"/>
      </svg>
    `;
    return L.divIcon({
      html: markerHtml,
      className: '',
      iconSize: [28, 28],
      iconAnchor: [14, 28],
      popupAnchor: [0, -28]
    });
};

// Component to render map objects declaratively
const RenderMapObjects = ({ mapObjects, layerVisibility, handleObjectClick }) => {
    return (
        <>
            {mapObjects.map(obj => {
                if (!layerVisibility[obj.layer_id] || !obj.layers) {
                    return null;
                }

                const color = obj.layers?.color || '#3388ff';

                let details = `Слой: ${obj.layers?.name}<br>`;
                if(obj.area) details += `Площадь: ${obj.area}<br>`;
                if(obj.length) details += `Длина: ${obj.length}<br>`;
                if(obj.properties?.age) details += `Возраст: ${obj.properties.age} лет<br>`;

                const popupContent = `<strong>${obj.name || 'Без названия'}</strong><br>${details}${obj.description || ''}`;

                switch (obj.object_type) {
                    case 'marker':
                        return (
                            <Marker
                                key={obj.id}
                                position={[...obj.geometry.coordinates].reverse()}
                                icon={createColoredMarkerIcon(color)}
                                eventHandlers={{ click: () => handleObjectClick(obj) }}
                            >
                                <Popup>{popupContent}</Popup>
                            </Marker>
                        );
                    case 'line':
                        const linePositions = obj.geometry.coordinates.map(c => [c[1], c[0]]);
                        return (
                            <Polyline
                                key={obj.id}
                                positions={linePositions}
                                pathOptions={{ color }}
                                eventHandlers={{ click: () => handleObjectClick(obj) }}
                            >
                                <Popup>{popupContent}</Popup>
                            </Polyline>
                        );
                    case 'polygon':
                        const polygonPositions = obj.geometry.coordinates[0].map(c => [c[1], c[0]]);
                        return (
                            <Polygon
                                key={obj.id}
                                positions={polygonPositions}
                                pathOptions={{ color, fillColor: color, fillOpacity: 0.5 }}
                                eventHandlers={{ click: () => handleObjectClick(obj) }}
                            >
                                <Popup>{popupContent}</Popup>
                            </Polygon>
                        );
                    default:
                        return null;
                }
            })}
        </>
    );
};

// Component to handle map mode switching
const MapModeSwitcher = ({ mode }) => {
    const map = useMap();
    const currentLayer = useRef(null);

    useEffect(() => {
        if (currentLayer.current) {
            map.removeLayer(currentLayer.current);
        }

        let newTileLayer;
        let url;
        switch (mode) {
            case 'satellite':
                url = 'https://core-sat.maps.yandex.net/tiles?l=sat&v=3.1072.0&x={x}&y={y}&z={z}&scale=1&lang=ru_RU';
                newTileLayer = L.tileLayer(url, { attribution: '© Яндекс', maxZoom: 19 });
                break;
            case 'hybrid':
                 const satLayer = L.tileLayer('https://core-sat.maps.yandex.net/tiles?l=sat&v=3.1072.0&x={x}&y={y}&z={z}&scale=1&lang=ru_RU', {
                    attribution: '© Яндекс',
                    maxZoom: 19
                 });
                 const sklLayer = L.tileLayer('https://core-renderer-tiles.maps.yandex.net/tiles?l=skl&v=21.06.03-0&x={x}&y={y}&z={z}&scale=1&lang=ru_RU', {
                    maxZoom: 19,
                    opacity: 0.8
                 });
                 newTileLayer = L.layerGroup([satLayer, sklLayer]);
                break;
            default: // scheme
                url = 'https://core-renderer-tiles.maps.yandex.net/tiles?l=map&v=21.06.03-0&x={x}&y={y}&z={z}&scale=1&lang=ru_RU';
                newTileLayer = L.tileLayer(url, { attribution: '© Яндекс', maxZoom: 19 });
        }

        map.addLayer(newTileLayer);
        currentLayer.current = newTileLayer;

    }, [mode, map]);

    return null;
};


const MapWithDrawing = ({ onBack, isObserver }) => {
  const [layers, setLayers] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentObject, setCurrentObject] = useState(null);
  const [mapObjects, setMapObjects] = useState([]);
  const [mapMode, setMapMode] = useState('scheme');
  const [showCreateLayerModal, setShowCreateLayerModal] = useState(false);
  const [showEditLayerModal, setShowEditLayerModal] = useState(false);
  const [editingLayer, setEditingLayer] = useState(null);
  const [layerVisibility, setLayerVisibility] = useState({});
  const [draggedLayer, setDraggedLayer] = useState(null);
  const [newLayerData, setNewLayerData] = useState({ name: '', color: '#4CAF50' });
  const [map, setMap] = useState(null);

  useEffect(() => {
    loadLayers();
  }, []);

  useEffect(() => {
    if (map && layers.length > 0) {
      loadMapObjects();
    }
  }, [map, layers]);

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
    
    newLayers.splice(draggedIndex, 1)
    newLayers.splice(targetIndex, 0, draggedLayer)
    
    setLayers(newLayers)
    setDraggedLayer(null)
  }

  const saveObject = async (formData) => {
    if (!currentObject || !formData.layer_id) {
      alert('Необходимо выбрать слой.');
      return;
    }
    if (!formData.name || formData.name.trim() === '') {
      alert('Необходимо указать название объекта.');
      return;
    }

    const { layer_id, name, description, ...properties } = formData;
    const selectedLayer = layers.find(l => l.id === layer_id);

    if (selectedLayer) {
        let missingField = '';
        switch (selectedLayer.name) {
            case 'Деревья':
                if (!properties.age) missingField = 'Возраст';
                if (!properties.variety_id) missingField = 'Сорт';
                break;
            case 'Кустарники':
                if (!properties.variety_id) missingField = 'Сорт';
                break;
            case 'Малые архитектурные формы':
                if (!properties.type_id) missingField = 'Тип МАФ';
                break;
            default: break;
        }
        if (missingField) {
            alert(`Для слоя "${selectedLayer.name}" необходимо заполнить поле "${missingField}".`);
            return;
        }
    }

    const isEditing = currentObject.id;
    const variety_ids = properties.variety_ids;
    if (selectedLayer?.name === 'Клумбы') {
        delete properties.variety_ids;
    }

    const dataToSave = {
        layer_id,
        name,
        description,
        properties
    };

    let result;
    if (isEditing) {
      result = await supabase.from('map_objects').update(dataToSave).eq('id', currentObject.id).select().single();
    } else {
      const { geometry, object_type } = currentObject;
      result = await supabase.from('map_objects').insert({ ...dataToSave, object_type, geometry }).select().single();
    }

    const { data: savedObject, error } = result;

    if (error) {
      console.error('Ошибка сохранения объекта:', error);
      alert(`Не удалось сохранить объект: ${error.message}`);
      if (selectedLayer?.name === 'Клумбы') {
          properties.variety_ids = variety_ids;
      }
    } else {
      if (selectedLayer?.name === 'Клумбы' && Array.isArray(variety_ids)) {
          const objectId = savedObject.id;

          const { error: deleteError } = await supabase.from('flowerbed_composition').delete().eq('flowerbed_id', objectId);

          if (deleteError) {
              console.error('Ошибка обновления состава клумбы (удаление):', deleteError);
              alert('Произошла ошибка при обновлении состава клумбы. Основные данные сохранены.');
          } else if (variety_ids.length > 0) {
              const compositionToInsert = variety_ids.map(id => ({ flowerbed_id: objectId, flower_variety_id: id }));
              const { error: insertError } = await supabase.from('flowerbed_composition').insert(compositionToInsert);
              if (insertError) {
                  console.error('Ошибка обновления состава клумбы (вставка):', insertError);
                  alert('Не удалось сохранить новый состав клумбы. Основные данные были сохранены.');
              }
          }
      }

      alert(isEditing ? 'Объект успешно обновлен!' : 'Объект успешно создан!');
      setIsModalOpen(false);
      setCurrentObject(null);
      loadMapObjects();
    }
  };

  const handleObjectClick = (obj) => {
    if (isObserver || !map) return;

    const objectToEdit = { ...obj };

    if (objectToEdit.geometry) {
      if (objectToEdit.object_type === 'line' && objectToEdit.layers.name === 'Кустарники') {
        let length = 0;
        const latLngs = objectToEdit.geometry.coordinates.map(c => L.latLng(c[1], c[0]));
        if (latLngs.length > 1) {
          for (let i = 0; i < latLngs.length - 1; i++) {
            length += map.distance(latLngs[i], latLngs[i + 1]);
          }
        }
        objectToEdit.length = `${length.toFixed(2)} м`;
      }
    }

    setCurrentObject(objectToEdit);
    setIsModalOpen(true);
  };

  const loadMapObjects = async () => {
    const [{ data: objects, error: objectsError }, { data: compositions, error: compositionsError }] = await Promise.all([
        supabase.from('map_objects').select(`*, layers!inner(name, color)`),
        supabase.from('flowerbed_composition').select('flowerbed_id, flower_variety_id')
    ]);

    if (objectsError) {
      console.error("Ошибка загрузки объектов:", objectsError);
      return;
    }
    if (compositionsError) {
      console.error("Ошибка загрузки состава клумб:", compositionsError);
    }

    const compositionMap = (compositions || []).reduce((acc, item) => {
        if (!acc[item.flowerbed_id]) {
            acc[item.flowerbed_id] = [];
        }
        acc[item.flowerbed_id].push(item.flower_variety_id);
        return acc;
    }, {});

    const newMapObjects = objects.map(obj => {
        if (obj.layers?.name === 'Клумбы') {
            obj.properties.variety_ids = compositionMap[obj.id] || [];
        }

        if (obj.geometry) {
            if (obj.object_type === 'polygon' && (obj.layers.name === 'Газоны' || obj.layers.name === 'Клумбы')) {
                const latLngs = obj.geometry.coordinates[0].map(c => [c[1], c[0]]);
                const area = L.GeometryUtil.geodesicArea(latLngs);
                obj.area = `${area.toFixed(2)} м²`;
            }
             let firstCoord = obj.object_type === 'marker'
              ? obj.geometry.coordinates
              : (obj.geometry.coordinates[0][0] || obj.geometry.coordinates[0]);
            obj.coordinates_str = `${firstCoord[1].toFixed(5)}, ${firstCoord[0].toFixed(5)}`;
        }

        return obj;
    });

    setMapObjects(newMapObjects);
  };

  const _onCreated = (e) => {
    if (layers.length === 0) {
        alert('Пожалуйста, сначала создайте хотя бы один слой.');
        return;
    }

    const { layerType, layer } = e;
    const geoJSON = layer.toGeoJSON();

    let object_type = layerType;
    if(layerType === 'polyline') {
        object_type = 'line';
    }

    setCurrentObject({
      geometry: geoJSON.geometry,
      object_type: object_type,
      properties: {},
    });
    setIsModalOpen(true);
  };

  const deleteObject = async () => {
    if (!currentObject || !currentObject.id) {
      alert('Невозможно удалить объект без ID.');
      return;
    }

    const { error } = await supabase
      .from('map_objects')
      .delete()
      .eq('id', currentObject.id);

    if (error) {
      console.error('Ошибка удаления объекта:', error);
      alert(`Не удалось удалить объект: ${error.message}`);
    } else {
      alert('Объект успешно удален!');
      setIsModalOpen(false);
      setCurrentObject(null);
      loadMapObjects();
    }
  };

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
      .select()

    if (error) {
      console.error('Ошибка редактирования слоя:', error)
      alert('Ошибка редактирования слоя')
    } else if (data && data.length > 0) {
      alert('Слой успешно обновлён')
      setShowEditLayerModal(false)
      setEditingLayer(null)
      setNewLayerData({ name: '', color: '#4CAF50' })
      loadLayers()
      loadMapObjects()
    } else {
      console.error('Не удалось обновить слой, данные не вернулись.')
      alert('Не удалось обновить слой.')
    }
  }

  const deleteLayer = async (layer) => {
    if (!confirm(`Удалить слой "${layer.name}"? Все ОБЪЕКТЫ этого слоя тоже будут удалены.`)) {
      return;
    }

    const { error } = await supabase
      .from('layers')
      .delete()
      .eq('id', layer.id);

    if (error) {
      console.error('Ошибка удаления слоя:', error);
      alert(`Не удалось удалить слой: ${error.message}`);
    } else {
      alert('Слой и все связанные объекты успешно удалены');
      loadLayers();
      loadMapObjects(); // Force a refresh of map objects
    }
  };

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
              <h1 style={{ fontSize: '24px', margin: '0', color: '#4A5D23' }}>Grasscutter</h1>
              <span style={{ fontSize: '12px', color: '#999', marginLeft: '8px', fontWeight: '400' }}>1.0</span>
            </div>
          </div>
          <div style={{ height: '1px', background: '#e0e0e0', margin: '10px 0' }}></div>
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: '10px'
          }}>
            <h3 style={{ fontSize: '16px', color: '#333', margin: '0', fontWeight: '600' }}>Слои</h3>
            <button 
              onClick={createLayer}
              disabled={isObserver}
              style={{
                backgroundColor: isObserver ? '#ccc' : '#4A5D23',
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
            {layers.map((layer) => (
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
                  cursor: 'grab'
                }}
              >
                <div style={{ marginRight: '6px', color: '#ccc', fontSize: '12px', cursor: 'grab' }}>⋮⋮</div>
                <button
                  onClick={() => deleteLayer(layer)}
                  disabled={isObserver}
                  style={{
                    background: 'none', border: 'none', cursor: isObserver ? 'not-allowed' : 'pointer',
                    padding: '2px', marginRight: '6px', color: isObserver ? '#ccc' : '#666'
                  }}
                  title="Удалить слой"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                  </svg>
                </button>
                <button
                  onClick={() => editLayer(layer)}
                  disabled={isObserver}
                  style={{
                    background: 'none', border: 'none', cursor: isObserver ? 'not-allowed' : 'pointer',
                    padding: '2px', marginRight: '8px', color: isObserver ? '#ccc' : '#666'
                  }}
                  title="Редактировать слой"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                  </svg>
                </button>
                <div style={{ width: '12px', height: '12px', backgroundColor: layer.color, borderRadius: '2px', marginRight: '8px' }}></div>
                <span style={{ flex: 1, color: '#333' }}>{layer.name}</span>
                <label style={{ position: 'relative', display: 'inline-block', width: '32px', height: '18px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={layerVisibility[layer.id] !== false}
                    onChange={() => toggleLayerVisibility(layer.id)}
                    style={{ display: 'none' }}
                  />
                  <span style={{
                    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: layerVisibility[layer.id] !== false ? '#4A5D23' : '#ccc',
                    borderRadius: '18px', transition: 'all 0.2s'
                  }}>
                    <span style={{
                      position: 'absolute', content: '', height: '14px', width: '14px',
                      left: layerVisibility[layer.id] !== false ? '16px' : '2px',
                      bottom: '2px', backgroundColor: 'white', borderRadius: '50%',
                      transition: 'all 0.2s'
                    }}></span>
                  </span>
                </label>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ flex: 1, height: '100vh', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '15px', right: '15px', zIndex: 1000, display: 'flex', backgroundColor: 'white', borderRadius: '6px', boxShadow: '0 2px 8px rgba(0,0,0,0.15)', overflow: 'hidden' }}>
          <button onClick={() => setMapMode('scheme')} style={{ padding: '8px 12px', border: 'none', backgroundColor: mapMode === 'scheme' ? '#4A5D23' : 'white', color: mapMode === 'scheme' ? 'white' : '#333', fontSize: '12px', cursor: 'pointer', transition: 'all 0.2s' }}>Схема</button>
          <button onClick={() => setMapMode('satellite')} style={{ padding: '8px 12px', border: 'none', borderLeft: '1px solid #e0e0e0', backgroundColor: mapMode === 'satellite' ? '#4A5D23' : 'white', color: mapMode === 'satellite' ? 'white' : '#333', fontSize: '12px', cursor: 'pointer', transition: 'all 0.2s' }}>Спутник</button>
          <button onClick={() => setMapMode('hybrid')} style={{ padding: '8px 12px', border: 'none', borderLeft: '1px solid #e0e0e0', backgroundColor: mapMode === 'hybrid' ? '#4A5D23' : 'white', color: mapMode === 'hybrid' ? 'white' : '#333', fontSize: '12px', cursor: 'pointer', transition: 'all 0.2s' }}>Гибрид</button>
        </div>
        
        <MapContainer
          center={[55.709362, 52.308385]}
          zoom={15}
          style={{ height: '100%', width: '100%' }}
          whenCreated={setMap}
        >
            <MapModeSwitcher mode={mapMode} />
            <FeatureGroup>
                {!isObserver && (
                <EditControl
                    position="topleft"
                    onCreated={_onCreated}
                    draw={{
                        rectangle: false,
                        circle: false,
                        circlemarker: false,
                        polygon: {
                            allowIntersection: false,
                            drawError: {
                                color: '#e1e100',
                                message: '<strong>Ошибка!</strong> Нельзя рисовать самопересекающиеся полигоны!',
                            },
                        },
                    }}
                />
                )}
            </FeatureGroup>
            <RenderMapObjects
                mapObjects={mapObjects}
                layerVisibility={layerVisibility}
                handleObjectClick={handleObjectClick}
            />
        </MapContainer>
      </div>

      {isModalOpen && (
        <ObjectModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setCurrentObject(null);
          }}
          onSave={saveObject}
          onDelete={deleteObject}
          objectData={currentObject}
          layers={layers}
        />
      )}

      {showCreateLayerModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000 }}>
          <div style={{ background: 'white', padding: '25px', borderRadius: '12px', minWidth: '400px', boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }}>
            <h3 style={{ margin: '0 0 20px 0' }}>Создание нового слоя</h3>
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Название слоя*:</label>
              <input type="text" value={newLayerData.name} onChange={(e) => setNewLayerData({...newLayerData, name: e.target.value})} style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '14px' }} placeholder="Введите название слоя" />
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Цвет:</label>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <input type="color" value={newLayerData.color} onChange={(e) => setNewLayerData({...newLayerData, color: e.target.value})} style={{ width: '50px', height: '35px', border: '1px solid #ddd', borderRadius: '4px', cursor: 'pointer' }} />
                <input type="text" value={newLayerData.color} onChange={(e) => setNewLayerData({...newLayerData, color: e.target.value})} style={{ flex: 1, padding: '8px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '14px' }} placeholder="#4CAF50" />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={saveNewLayer} style={{ flex: 1, padding: '10px', backgroundColor: '#4A5D23', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '14px' }}>Создать</button>
              <button onClick={() => { setShowCreateLayerModal(false); setNewLayerData({ name: '', color: '#4CAF50' }); }} style={{ flex: 1, padding: '10px', backgroundColor: '#757575', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '14px' }}>Отмена</button>
            </div>
          </div>
        </div>
      )}

      {showEditLayerModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000 }}>
          <div style={{ background: 'white', padding: '25px', borderRadius: '12px', minWidth: '400px', boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }}>
            <h3 style={{ margin: '0 0 20px 0' }}>Редактирование слоя</h3>
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Название слоя*:</label>
              <input type="text" value={newLayerData.name} onChange={(e) => setNewLayerData({...newLayerData, name: e.target.value})} style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '14px' }} placeholder="Введите название слоя" />
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Цвет:</label>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <input type="color" value={newLayerData.color} onChange={(e) => setNewLayerData({...newLayerData, color: e.target.value})} style={{ width: '50px', height: '35px', border: '1px solid #ddd', borderRadius: '4px', cursor: 'pointer' }}/>
                <input type="text" value={newLayerData.color} onChange={(e) => setNewLayerData({...newLayerData, color: e.target.value})} style={{ flex: 1, padding: '8px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '14px' }} placeholder="#4CAF50"/>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={saveEditedLayer} style={{ flex: 1, padding: '10px', backgroundColor: '#4A5D23', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '14px' }}>Сохранить</button>
              <button onClick={() => { setShowEditLayerModal(false); setEditingLayer(null); setNewLayerData({ name: '', color: '#4CAF50' }); }} style={{ flex: 1, padding: '10px', backgroundColor: '#757575', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '14px' }}>Отмена</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default MapWithDrawing;