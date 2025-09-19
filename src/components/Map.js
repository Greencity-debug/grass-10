"use client";

import { useRef, useState } from "react";
import dynamic from "next/dynamic";

const MapInitializer = dynamic(() => import("./MapInitializer"), { ssr: false });

export default function YandexMap() {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const [mapType, setMapType] = useState('yandex#map'); // Изменено на 'yandex#map'

  const handleMapTypeChange = (newType) => {
    setMapType(newType);
  };

  return (
    <div className="map-container" ref={mapContainer}>
      <MapInitializer mapContainer={mapContainer} map={map} mapType={mapType} />
      <div className="map-controls">
        <button
          className={mapType === 'yandex#map' ? 'active-button' : ''}
          onClick={() => handleMapTypeChange('yandex#map')}
        >
          Схема
        </button>
        <button
          className={mapType === 'yandex#satellite' ? 'active-button' : ''}
          onClick={() => handleMapTypeChange('yandex#satellite')}
        >
          Спутник
        </button>
        <button
          className={mapType === 'yandex#hybrid' ? 'active-button' : ''}
          onClick={() => handleMapTypeChange('yandex#hybrid')}
        >
          Гибрид
        </button>
      </div>
    </div>
  );
}