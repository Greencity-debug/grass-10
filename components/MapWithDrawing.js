'use client'

import { useRef, useEffect, useCallback, useState } from 'react';
import Sidebar from '@/components/Sidebar';
import MapCanvas from '@/components/MapCanvas';
import LayerModal from '@/components/LayerModal';
import FeatureModal from '@/components/FeatureModal';
import { useMapDrawing } from '@/hooks/useMapDrawing';
import { useLayers } from '@/hooks/useLayers';
import { useFeatureEditor } from '@/hooks/useFeatureEditor';
import { supabase } from '@/lib/supabase';
import { getTreeShrubColor, getLawnColor } from '@/lib/colorUtils';
import L from 'leaflet';

const MapWithDrawing = ({ onBack }) => {
  const mapRef = useRef(null);
  const featureLayersRef = useRef(new Map());
  const [hintText, setHintText] = useState('');

  const {
    layers,
    layerVisibility,
    showCreateLayerModal,
    showEditLayerModal,
    newLayerData,
    setNewLayerData,
    handleDragStart,
    handleDragOver,
    handleDrop,
    openCreateLayerModal,
    closeCreateLayerModal,
    openEditLayerModal,
    closeEditLayerModal,
    saveNewLayer,
    saveEditedLayer,
    deleteLayer,
    toggleLayerVisibility,
  } = useLayers();

  const {
    isModalOpen,
    isEditing,
    featureData,
    shapeType,
    sorts,
    openNewFeatureModal,
    openEditFeatureModal,
    closeFeatureModal,
    saveFeature,
    deleteFeature,
    updateFeatureGeometry,
    setFeatureData
  } = useFeatureEditor(layers);

  // --- Handlers for events from hooks ---
  const handleShapeCreated = useCallback((layer, shape) => {
    openNewFeatureModal(layer, shape);
  }, [openNewFeatureModal]);

  const handleShapeEdited = useCallback(async (layer, newGeometry) => {
    if (layer.featureId && layer.featureType) {
      const success = await updateFeatureGeometry(layer.featureId, layer.featureType, newGeometry);
      if (success) {
        // Reload features to display updated data like area/length in popups
        await loadFeatures();
      }
    }
  }, [updateFeatureGeometry, loadFeatures]);

  const handleShapeRemoved = useCallback(async (layer) => {
    if (layer.featureId) {
      const success = await deleteFeature(layer.featureId);
      if (success) {
        featureLayersRef.current.delete(layer.featureId);
      }
    }
  }, [deleteFeature]);

  const handleDrawStart = useCallback((shape) => {
    let hint = 'Кликните на карту, чтобы добавить точки.';
    if (shape === 'Polyline') hint = 'Двойной клик для завершения линии.';
    else if (shape === 'Polygon') hint = 'Кликните на первую точку, чтобы завершить полигон.';
    setHintText(hint);
  }, []);

  const handleDrawEnd = useCallback(() => {
    setHintText('');
  }, []);

  const {
    map,
    mapMode,
    switchMapMode,
  } = useMapDrawing(mapRef, {
      onShapeCreated: handleShapeCreated,
      onShapeEdited: handleShapeEdited,
      onShapeRemoved: handleShapeRemoved,
      onDrawStart: handleDrawStart,
      onDrawEnd: handleDrawEnd,
  });

  const createPopupContent = (feature) => {
    let content = `<strong>${feature.name}</strong>`;
    if (feature.layers && feature.layers.name) {
        content += `<br>Слой: ${feature.layers.name}`;
    }
    if (feature.type === 'tree' || feature.type === 'shrub') {
        content += `<br>Возраст: ${feature.age || 0} лет`;
    }
    if (feature.type === 'shrub') {
        content += `<br>Длина: ${feature.length ? Math.round(feature.length) : '0'} м`;
    }
    if (['lawn', 'flowerbed', 'polygon'].includes(feature.type)) {
        content += `<br>Площадь: ${feature.area ? Math.round(feature.area) : '0'} м²`;
    }
    if (feature.description) {
        content += `<br><small><i>${feature.description}</i></small>`;
    }
    return content;
  };

  const loadFeatures = useCallback(async () => {
    if (!map) return;

    featureLayersRef.current.forEach(layer => layer.remove());
    featureLayersRef.current.clear();

    const { data, error } = await supabase.from('features').select('*, layers(name, color)');

    if (error) {
      console.error("Ошибка загрузки объектов:", error);
      return;
    }

    data.forEach(feature => {
      let layer;
      let color;
      const geometry = feature.geometry;

      switch (feature.type) {
        case 'tree': case 'shrub': color = getTreeShrubColor(feature.created_at); break;
        case 'lawn': color = getLawnColor(feature.created_at); break;
        default: color = feature.layers?.color || '#3388ff';
      }

      if (geometry.type === 'Point') {
        layer = L.marker([geometry.coordinates[1], geometry.coordinates[0]], {
          icon: L.divIcon({ className: 'custom-div-icon', html: `<div style='background-color:${color};' class='marker-pin'></div>` })
        });
      } else if (geometry.type === 'LineString') {
        layer = L.polyline(geometry.coordinates.map(c => [c[1], c[0]]), { color, weight: 4 });
      } else if (geometry.type === 'Polygon') {
        layer = L.polygon(geometry.coordinates[0].map(c => [c[1], c[0]]), { color, weight: 2 });
      }

      if (layer) {
        layer.featureId = feature.id;
        layer.featureLayerId = feature.layer_id;
        layer.featureType = feature.type;
        layer.bindPopup(createPopupContent(feature));
        layer.on('dblclick', () => openEditFeatureModal(feature.id));

        featureLayersRef.current.set(feature.id, layer);

        if (layerVisibility[feature.layer_id] !== false) {
          layer.addTo(map);
        }
      }
    });
  }, [map, openEditFeatureModal]);

  useEffect(() => {
    loadFeatures();
  }, [loadFeatures]);

  useEffect(() => {
    if (!map) return;
    featureLayersRef.current.forEach((layer) => {
        const isVisible = layerVisibility[layer.featureLayerId];
        if (isVisible && !map.hasLayer(layer)) {
            map.addLayer(layer);
        } else if (!isVisible && map.hasLayer(layer)) {
            map.removeLayer(layer);
        }
    });
  }, [layerVisibility, map]);

  const handleSaveFeature = async () => {
    const success = await saveFeature();
    if (success) loadFeatures();
  };

  const handleBackClick = () => onBack && typeof onBack === 'function' ? onBack() : window.history.back();

  const handleDeleteLayer = async (layer) => {
      await deleteLayer(layer);
      await loadFeatures();
  }

  return (
    <div style={{ height: '100vh', display: 'flex', overflow: 'hidden' }}>
      <Sidebar
        onBack={handleBackClick}
        onCreateLayer={openCreateLayerModal}
        layers={layers}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onDeleteLayer={handleDeleteLayer}
        onEditLayer={openEditLayerModal}
        layerVisibility={layerVisibility}
        onToggleLayerVisibility={toggleLayerVisibility}
      />
      <MapCanvas
        mapRef={mapRef}
        mapMode={mapMode}
        onSwitchMapMode={switchMapMode}
        hintText={hintText}
      />
      <FeatureModal
        isOpen={isModalOpen}
        isEditing={isEditing}
        onClose={closeFeatureModal}
        onSave={handleSaveFeature}
        featureData={featureData}
        setFeatureData={setFeatureData}
        shapeType={shapeType}
        layers={layers}
        sorts={sorts}
      />
      <LayerModal
        isOpen={showCreateLayerModal}
        onClose={closeCreateLayerModal}
        onSave={saveNewLayer}
        layerData={newLayerData}
        onLayerDataChange={setNewLayerData}
        mode="create"
      />
      <LayerModal
        isOpen={showEditLayerModal}
        onClose={closeEditLayerModal}
        onSave={saveEditedLayer}
        layerData={newLayerData}
        onLayerDataChange={setNewLayerData}
        mode="edit"
      />
    </div>
  );
};

export default MapWithDrawing;