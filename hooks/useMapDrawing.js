import { useState, useEffect, useCallback } from 'react';
import L from 'leaflet';
import '@geoman-io/leaflet-geoman-free';

// Fix for default Leaflet icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

export const useMapDrawing = (mapRef, { onShapeCreated, onShapeEdited, onShapeRemoved, onDrawStart, onDrawEnd }) => {
  const [map, setMap] = useState(null);
  const [mapMode, setMapMode] = useState('scheme');
  const [currentTileLayer, setCurrentTileLayer] = useState(null);

  const initializeMap = useCallback(() => {
    if (mapRef.current && !map) {
      const mapInstance = L.map(mapRef.current, { center: [55.709362, 52.308385], zoom: 15, zoomControl: true });
      const tileLayer = L.tileLayer('https://core-renderer-tiles.maps.yandex.net/tiles?l=map&v=21.06.03-0&x={x}&y={y}&z={z}&scale=1&lang=ru_RU', {
        attribution: '© Яндекс', maxZoom: 19
      }).addTo(mapInstance);
      setCurrentTileLayer(tileLayer);
      setMap(mapInstance);
      setTimeout(() => mapInstance.invalidateSize(), 100);
    }
  }, [mapRef, map]);

  useEffect(() => {
    initializeMap();
    return () => { if (map) map.remove(); };
  }, [initializeMap, map]);

  useEffect(() => {
    if (map) {
        map.pm.setLang('ru');
        map.pm.setGlobalOptions({ snappable: false }); // Disable snapping
        map.pm.addControls({
            position: 'topleft',
            drawMarker: true,
            drawPolyline: true,
            drawPolygon: true,
            drawRectangle: false,
            drawCircle: false,
            drawCircleMarker: false,
            drawText: false,
            editMode: true, // Edit mode is ON by default
            dragMode: false,
            cutPolygon: false,
            removalMode: true,
        });

        const handleCreate = (e) => {
            if (onShapeCreated) onShapeCreated(e.layer, e.shape);
            if (onDrawEnd) onDrawEnd();
        };
        const handleEdit = (e) => onShapeEdited && onShapeEdited(e.layer, e.layer.toGeoJSON().geometry);
        const handleRemove = (e) => onShapeRemoved && onShapeRemoved(e.layer);
        const handleDrawStart = (e) => onDrawStart && onDrawStart(e.shape);
        const handleDrawEnd = () => onDrawEnd && onDrawEnd();

        map.on('pm:create', handleCreate);
        map.on('pm:edit', handleEdit);
        map.on('pm:remove', handleRemove);
        map.on('pm:drawstart', handleDrawStart);
        map.on('pm:drawend', handleDrawEnd);

        return () => {
            map.pm.removeControls();
            map.off('pm:create', handleCreate);
            map.off('pm:edit', handleEdit);
            map.off('pm:remove', handleRemove);
            map.off('pm:drawstart', handleDrawStart);
            map.off('pm:drawend', handleDrawEnd);
        };
    }
  }, [map, onShapeCreated, onShapeEdited, onShapeRemoved, onDrawStart, onDrawEnd]);

  const switchMapMode = (mode) => {
    if (!map || !currentTileLayer) return;
    map.removeLayer(currentTileLayer);
    let newTileLayer;
    switch (mode) {
      case 'satellite':
        newTileLayer = L.tileLayer('https://core-sat.maps.yandex.net/tiles?l=sat&v=3.1072.0&x={x}&y={y}&z={z}&scale=1&lang=ru_RU', { attribution: '© Яндекс', maxZoom: 19 });
        break;
      case 'hybrid':
        newTileLayer = L.layerGroup([
          L.tileLayer('https://core-sat.maps.yandex.net/tiles?l=sat&v=3.1072.0&x={x}&y={y}&z={z}&scale=1&lang=ru_RU', { attribution: '© Яндекс', maxZoom: 19 }),
          L.tileLayer('https://core-renderer-tiles.maps.yandex.net/tiles?l=skl&v=21.06.03-0&x={x}&y={y}&z={z}&scale=1&lang=ru_RU', { maxZoom: 19, opacity: 0.8 })
        ]);
        break;
      default:
        newTileLayer = L.tileLayer('https://core-renderer-tiles.maps.yandex.net/tiles?l=map&v=21.06.03-0&x={x}&y={y}&z={z}&scale=1&lang=ru_RU', { attribution: '© Яндекс', maxZoom: 19 });
    }
    newTileLayer.addTo(map);
    setCurrentTileLayer(newTileLayer);
    setMapMode(mode);
  };

  return { map, mapMode, switchMapMode };
};