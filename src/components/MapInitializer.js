"use client";

import { useEffect, useRef } from "react";

export default function MapInitializer({ mapContainer, map, mapType }) {
  const isMapInitialized = useRef(false);

  useEffect(() => {
    // Инициализируем карту только один раз
    if (isMapInitialized.current) {
      return;
    }

    if (window.ymaps && window.ymaps.ready) {
      window.ymaps.ready(() => {
        if (map.current) {
          return;
        }

        map.current = new window.ymaps.Map(mapContainer.current, {
          center: [55.885845, 52.309207],
          zoom: 15,
          controls: ['zoomControl', 'fullscreenControl'],
        });
        isMapInitialized.current = true;
      });
    }

    // Функция очистки: уничтожает карту, когда компонент размонтируется
    return () => {
      if (map.current) {
        map.current.destroy();
        map.current = null;
        isMapInitialized.current = false;
      }
    };
  }, [mapContainer, map]);

  // Этот useEffect будет реагировать на изменение mapType и менять тип карты
  useEffect(() => {
    if (map.current) {
      map.current.setType(mapType);
    }
  }, [mapType]);

  return null;
}