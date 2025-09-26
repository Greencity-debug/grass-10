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

  // 1. Initialize map hook
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

  // 2. Initialize layers hook
  const {
    layers,
    loadLayers,
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

  // 3. Initialize polygons hook, passing it dependencies from other hooks
  const {
    loadPolygons,
    showSavePolygonModal,
    openSavePolygonModal,
    closeSavePolygonModal,
    polygonData,
    setPolygonData,
    savePolygon,
  } = usePolygons(map, layerVisibility);

  // 4. Handle side effects and data flow between hooks
  useEffect(() => {
    // When the map is ready, load the polygons
    if (map) {
      loadPolygons();
    }
  }, [map, loadPolygons]);

  // This function is passed to the map hook and called when drawing is finished
  function handleFinishDrawing(finalPoints) {
    if (layers.length === 0) {
      alert('Для сохранения полигона необходимо создать хотя бы один слой.');
      cancelDrawing();
      return;
    }
    openSavePolygonModal(finalPoints);
  }

  // This function is passed to the polygon modal
  const handleSavePolygon = async () => {
    // We pass the current drawing points to the save function
    await savePolygon(drawingPoints);
    // After saving, clear the temporary polygon from the map
    clearDrawing();
  };

  const handleBackClick = () => {
    if (onBack && typeof onBack === 'function') {
      onBack();
    } else {
      window.history.back();
    }
  };

  // Wrapper for deleteLayer to also refresh polygons
  const handleDeleteLayer = async (layer) => {
      await deleteLayer(layer);
      // After deleting a layer, we must reload polygons to remove associated ones
      await loadPolygons();
  }

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
        onDeleteLayer={handleDeleteLayer}
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