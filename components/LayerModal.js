import React from 'react';
import styles from './Modal.module.css';

const LayerModal = ({
  isOpen,
  onClose,
  onSave,
  layerData,
  onLayerDataChange,
  mode = 'create'
}) => {
  if (!isOpen) return null;

  const title = mode === 'create' ? 'Создание нового слоя' : 'Редактирование слоя';
  const buttonText = mode === 'create' ? 'Создать' : 'Сохранить';

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <h3 className={styles.title}>{title}</h3>

        <div className={styles.formGroup}>
          <label className={styles.label}>Название слоя*:</label>
          <input
            type="text"
            value={layerData.name}
            onChange={(e) => onLayerDataChange({ ...layerData, name: e.target.value })}
            className={styles.input}
            placeholder="Введите название слоя"
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Цвет:</label>
          <div className={styles.colorInputContainer}>
            <input
              type="color"
              value={layerData.color}
              onChange={(e) => onLayerDataChange({ ...layerData, color: e.target.value })}
              className={styles.colorPicker}
            />
            <input
              type="text"
              value={layerData.color}
              onChange={(e) => onLayerDataChange({ ...layerData, color: e.target.value })}
              className={`${styles.input} ${styles.colorHexInput}`}
              placeholder="#4CAF50"
            />
          </div>
        </div>

        <div className={styles.buttonGroup}>
          <button onClick={onSave} className={`${styles.button} ${styles.primary}`}>
            {buttonText}
          </button>
          <button onClick={onClose} className={`${styles.button} ${styles.secondary}`}>
            Отмена
          </button>
        </div>
      </div>
    </div>
  );
};

export default LayerModal;