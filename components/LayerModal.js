import React from 'react';
import styles from './LayerModal.module.css';

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
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h2 className={styles.title}>{title}</h2>
        <div className={styles.form}>
            <div className={styles.formGroup}>
                <label className={styles.label}>Название слоя*</label>
                <input
                    type="text"
                    value={layerData.name}
                    onChange={(e) => onLayerDataChange({ ...layerData, name: e.target.value })}
                    className={styles.input}
                    placeholder="Введите название слоя"
                />
            </div>
            <div className={styles.formGroup}>
                <label className={styles.label}>Цвет</label>
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
                        className={styles.input}
                        placeholder="#4CAF50"
                    />
                </div>
            </div>
        </div>
        <div className={styles.buttonGroup}>
          <button type="button" onClick={onClose} className={`${styles.button} ${styles.secondary}`}>
            Отмена
          </button>
          <button type="button" onClick={onSave} className={`${styles.button} ${styles.primary}`}>
            {buttonText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LayerModal;