import { useState, useEffect, useRef } from 'react';
import L from 'leaflet';

// Fix for default Leaflet icon issue with webpack
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});


export const useMapDrawing = (mapRef, onFinishDrawing) => {
  const [map, setMap] = useState(null);
  const [mapMode, setMapMode] = useState('scheme');
  const [currentTileLayer, setCurrentTileLayer] = useState(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawingPoints, setDrawingPoints] = useState([]);
  const currentPolygonRef = useRef(null);

  const initializeMap = () => {
    if (mapRef.current && !map) {
      const mapInstance = L.map(mapRef.current, {
        center: [55.709362, 52.308385],
        zoom: 15,
        zoomControl: true,
      });

      const tileLayer = L.tileLayer('https://core-renderer-tiles.maps.yandex.net/tiles?l=map&v=21.06.03-0&x={x}&y={y}&z={z}&scale=1&lang=ru_RU', {
        attribution: '© Яндекс',
        maxZoom: 19
      }).addTo(mapInstance);

      setCurrentTileLayer(tileLayer);
      mapInstance.on('click', handleMapClick);
      setMap(mapInstance);

      // Force map to re-render its size, fixing a common Leaflet issue in React
      setTimeout(() => mapInstance.invalidateSize(), 100);
    }
  };

  useEffect(() => {
    initializeMap();
    return () => {
      if (map) {
        map.remove();
      }
    };
  }, []);

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

  const updateCurrentPolygon = (points) => {
    if (!map) return;
    if (currentPolygonRef.current) {
      map.removeLayer(currentPolygonRef.current);
    }
    if (points.length < 2) return;

    const polygon = L.polygon(points, {
      color: '#2196F3',
      fillColor: '#2196F3',
      fillOpacity: 0.3,
      weight: 2
    }).addTo(map);
    currentPolygonRef.current = polygon;
  };

  const handleMapClick = (e) => {
    if (!isDrawing) return;

    const point = [e.latlng.lat, e.latlng.lng];
    const newPoints = [...drawingPoints, point];

    if (drawingPoints.length > 1) {
      const firstPoint = drawingPoints[0];
      const distance = map.distance(e.latlng, L.latLng(firstPoint));
      if (distance < 20) { // 20 meters tolerance for closing the polygon
        finishDrawing(drawingPoints); // pass current points, not the new one
        return;
      }
    }
    setDrawingPoints(newPoints);
    updateCurrentPolygon(newPoints);
  };

  const startDrawing = () => {
    setIsDrawing(true);
    setDrawingPoints([]);
    if (currentPolygonRef.current) {
      map.removeLayer(currentPolygonRef.current);
      currentPolygonRef.current = null;
    }
  };

  const cancelDrawing = () => {
    setIsDrawing(false);
    setDrawingPoints([]);
    if (currentPolygonRef.current) {
      map.removeLayer(currentPolygonRef.current);
      currentPolygonRef.current = null;
    }
  };

  const finishDrawing = (finalPoints) => {
    if (finalPoints.length < 3) {
      alert('Полигон должен содержать минимум 3 точки');
      cancelDrawing();
      return;
    }
    setIsDrawing(false);
    if (onFinishDrawing) {
      onFinishDrawing(finalPoints);
    }
    // Don't clear points here, let the polygon hook handle it
  };

  return {
    map,
    mapMode,
    switchMapMode,
    isDrawing,
    drawingPoints,
    startDrawing,
    cancelDrawing,
    clearDrawing: () => { // Function to be called after polygon is saved
      setDrawingPoints([]);
      if (currentPolygonRef.current) {
        map.removeLayer(currentPolygonRef.current);
        currentPolygonRef.current = null;
      }
    }
  };
};