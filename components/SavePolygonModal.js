import React from 'react';
import styles from './Modal.module.css';

const SavePolygonModal = ({
  isOpen,
  onClose,
  polygonData,
  onPolygonDataChange,
  layers,
  onSave
}) => {
  if (!isOpen) return null;

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <h3 className={styles.title}>Карточка полигона</h3>

        <div className={styles.formGroup}>
          <label className={styles.label}>Название*:</label>
          <input
            type="text"
            value={polygonData.name}
            onChange={(e) => onPolygonDataChange({ ...polygonData, name: e.target.value })}
            className={styles.input}
            placeholder="Введите название полигона"
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Описание:</label>
          <textarea
            value={polygonData.description}
            onChange={(e) => onPolygonDataChange({ ...polygonData, description: e.target.value })}
            className={styles.textarea}
            placeholder="Дополнительное описание (необязательно)"
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Слой*:</label>
          <select
            value={polygonData.layerId || ''}
            onChange={(e) => onPolygonDataChange({ ...polygonData, layerId: e.target.value })}
            className={styles.select}
          >
            <option value="">Выберите слой...</option>
            {layers.map(layer => (
              <option key={layer.id} value={layer.id}>{layer.name}</option>
            ))}
          </select>
        </div>

        <div className={styles.buttonGroup}>
          <button onClick={onSave} className={`${styles.button} ${styles.primary} ${styles.save}`}>
            Сохранить
          </button>
          <button onClick={onClose} className={`${styles.button} ${styles.secondary}`}>
            Отмена
          </button>
        </div>
      </div>
    </div>
  );
};

export default SavePolygonModal;