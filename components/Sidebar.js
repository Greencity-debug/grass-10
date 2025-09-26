import React from 'react';
import styles from './Sidebar.module.css';
import LayerItem from './LayerItem';

const Sidebar = ({
  onBack,
  onCreateLayer,
  layers,
  onDragStart,
  onDragOver,
  onDrop,
  onDeleteLayer,
  onEditLayer,
  layerVisibility,
  onToggleLayerVisibility
}) => {
  return (
    <div className={styles.sidebar}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerTop}>
          <button onClick={onBack} className={styles.backButton}>
            <svg width="8" height="14" viewBox="0 0 12 20" fill="currentColor">
              <path d="M11.67 2.17L10.25 0.75L0.75 10.25L10.25 19.75L11.67 18.33L3.58 10.25L11.67 2.17Z"/>
            </svg>
          </button>
          <div className={styles.titleContainer}>
            <h1 className={styles.title}>Grasscutter</h1>
            <span className={styles.version}>1.0</span>
          </div>
        </div>
        <div className={styles.divider}></div>
      </div>

      {/* The Toolbar section is now removed */}
      <div className={styles.sectionDivider}></div>

      {/* Layers */}
      <div className={styles.layersSection}>
        <div className={styles.layersHeader}>
          <h3 className={styles.sectionTitle}>Слои</h3>
          <button onClick={onCreateLayer} className={styles.addLayerButton}>+</button>
        </div>
        <div className={styles.layerList}>
          {layers.map((layer) => (
            <LayerItem
              key={layer.id}
              layer={layer}
              onDragStart={onDragStart}
              onDragOver={onDragOver}
              onDrop={onDrop}
              onDeleteLayer={onDeleteLayer}
              onEditLayer={onEditLayer}
              layerVisibility={layerVisibility}
              onToggleLayerVisibility={onToggleLayerVisibility}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default Sidebar;