import React from 'react';
import styles from './MapCanvas.module.css';
import DrawingHint from './DrawingHint';

const MapCanvas = ({ mapRef, mapMode, onSwitchMapMode, hintText }) => {
  return (
    <div className={styles.mapContainer}>
      <DrawingHint text={hintText} />
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