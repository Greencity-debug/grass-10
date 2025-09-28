import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export const usePolygons = (map, layerVisibility) => {
  const [polygons, setPolygons] = useState([]);
  const [showSavePolygonModal, setShowSavePolygonModal] = useState(false);
  const [polygonData, setPolygonData] = useState({ name: '', description: '', layerId: '' });

  const loadPolygons = useCallback(async () => {
    if (!map) return;
    const { data, error } = await supabase
      .from('polygons')
      .select(`*, layers (name, color)`);

    if (error) {
      console.error('🚨 Ошибка загрузки полигонов:', error);
      return;
    }

    if (data) {
      // Clear old polygons from map before adding new ones
      polygons.forEach(p => {
        if (p.leafletLayer) map.removeLayer(p.leafletLayer);
      });

      const L = require('leaflet');
      const newPolygons = data.map(polygon => {
        if (polygon && polygon.geometry && polygon.geometry.coordinates) { // Check if polygon is defined
          const coords = polygon.geometry.coordinates[0].map(coord => [coord[1], coord[0]]);
          const leafletLayer = L.polygon(coords, {
            color: polygon.layers?.color || '#4CAF50',
            fillColor: polygon.layers?.color || '#4CAF50',
            fillOpacity: 0.3,
            weight: 2
          }).bindPopup(`
            <strong>${polygon.name}</strong><br>
            ${polygon.description || ''}<br>
            Площадь: ${polygon.square ? (polygon.square / 10000).toFixed(2) + ' га' : 'не рассчитана'}
          `);
          return { ...polygon, leafletLayer };
        }
        return polygon;
      }).filter(Boolean); // Filter out any potential undefined entries
      setPolygons(newPolygons);
    }
  }, [map]); // Dependency on map ensures this runs when map is ready

  // Effect to draw/update polygons on the map when polygons state or visibility changes
  useEffect(() => {
    if (!map) return;
    polygons.forEach(polygon => {
      // Added safety checks
      if (polygon && polygon.leafletLayer) {
        const isVisible = layerVisibility[polygon.layer_id];
        if (isVisible && !map.hasLayer(polygon.leafletLayer)) {
          map.addLayer(polygon.leafletLayer);
        } else if (!isVisible && map.hasLayer(polygon.leafletLayer)) {
          map.removeLayer(polygon.leafletLayer);
        }
      }
    });
  }, [polygons, layerVisibility, map]);


  const openSavePolygonModal = () => {
    setPolygonData({ name: '', description: '', layerId: '' });
    setShowSavePolygonModal(true);
  };

  const closeSavePolygonModal = () => setShowSavePolygonModal(false);

  const savePolygon = async (drawingPoints) => {
    if (!polygonData.name.trim()) {
      alert('Введите название полигона');
      return;
    }
    if (!polygonData.layerId) {
      alert('Выберите слой для полигона');
      return;
    }

    const closedPoints = [...drawingPoints, drawingPoints[0]];
    const geoJson = {
      type: 'Polygon',
      coordinates: [closedPoints.map(point => [point[1], point[0]])],
    };

    const { error } = await supabase.from('polygons').insert({
      name: polygonData.name,
      description: polygonData.description,
      layer_id: polygonData.layerId,
      geometry: geoJson,
    });

    if (error) {
      console.error('Ошибка сохранения полигона:', error);
      alert('Ошибка сохранения полигона');
    } else {
      alert('Полигон успешно сохранен');
      closeSavePolygonModal();
      loadPolygons(); // Reload polygons to show the new one
    }
    return !error; // Return success status
  };

  return {
    polygons,
    loadPolygons,
    showSavePolygonModal,
    openSavePolygonModal,
    closeSavePolygonModal,
    polygonData,
    setPolygonData,
    savePolygon,
  };
};