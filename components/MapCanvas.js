import React from 'react';
import styles from './MapCanvas.module.css';

const MapCanvas = ({ mapRef, mapMode, onSwitchMapMode }) => {
  return (
    <div className={styles.mapContainer}>
      <div className={styles.modeSwitcher}>
        <button
          onClick={() => onSwitchMapMode('scheme')}
          className={`${styles.modeButton} ${mapMode === 'scheme' ? styles.active : ''}`}
        >
          Схема
        </button>
        <button
          onClick={() => onSwitchMapMode('satellite')}
          className={`${styles.modeButton} ${mapMode === 'satellite' ? styles.active : ''}`}
        >
          Спутник
        </button>
        <button
          onClick={() => onSwitchMapMode('hybrid')}
          className={`${styles.modeButton} ${mapMode === 'hybrid' ? styles.active : ''}`}
        >
          Гибрид
        </button>
      </div>

      <div ref={mapRef} className={styles.map} />
    </div>
  );
};

export default MapCanvas;