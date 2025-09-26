'use client'

import { useRef, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import MapCanvas from '@/components/MapCanvas';
import SavePolygonModal from '@/components/SavePolygonModal';
import LayerModal from '@/components/LayerModal';
import { useMapDrawing } from '@/hooks/useMapDrawing';
import { useLayers } from '@/hooks/useLayers';
import { usePolygons } from '@/hooks/usePolygons';

const MapWithDrawing = ({ onBack }) => {
  const mapRef = useRef(null);

  const {
    map,
    mapMode,
    switchMapMode,
    isDrawing,
    drawingPoints,
    startDrawing,
    cancelDrawing,
    clearDrawing
  } = useMapDrawing(mapRef, handleFinishDrawing);

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
    loadLayers,
  } = useLayers(reloadPolygonsAndLayers);

  const {
    loadPolygons,
    showSavePolygonModal,
    openSavePolygonModal,
    closeSavePolygonModal,
    polygonData,
    setPolygonData,
    savePolygon,
  } = usePolygons(map, layers, layerVisibility, handlePolygonSaved);

  function handleFinishDrawing(finalPoints) {
    if (layers.length === 0) {
      alert('Для сохранения полигона необходимо создать хотя бы один слой.');
      cancelDrawing();
      return;
    }
    openSavePolygonModal(finalPoints);
  }

  function handlePolygonSaved() {
    clearDrawing();
    loadPolygons();
  }

  function reloadPolygonsAndLayers() {
      loadPolygons();
      loadLayers();
  }

  useEffect(() => {
    if (map) {
      loadPolygons();
    }
  }, [map]);


  const handleSavePolygon = () => {
    savePolygon(drawingPoints);
  };

  const handleBackClick = () => {
    if (onBack && typeof onBack === 'function') {
      onBack();
    } else {
      window.history.back();
    }
  };

  return (
    <div style={{ height: '100vh', display: 'flex', overflow: 'hidden' }}>
      <Sidebar
        onBack={handleBackClick}
        isDrawing={isDrawing}
        onCancelDrawing={cancelDrawing}
        onStartDrawing={startDrawing}
        onFinishDrawing={() => handleFinishDrawing(drawingPoints)}
        drawingPointsCount={drawingPoints.length}
        onCreateLayer={openCreateLayerModal}
        layers={layers}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onDeleteLayer={deleteLayer}
        onEditLayer={openEditLayerModal}
        layerVisibility={layerVisibility}
        onToggleLayerVisibility={toggleLayerVisibility}
      />
      <MapCanvas
        mapRef={mapRef}
        mapMode={mapMode}
        onSwitchMapMode={switchMapMode}
      />
      <SavePolygonModal
        isOpen={showSavePolygonModal}
        onClose={closeSavePolygonModal}
        polygonData={polygonData}
        onPolygonDataChange={setPolygonData}
        layers={layers}
        onSave={handleSavePolygon}
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