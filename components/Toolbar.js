import React from 'react';
import styles from './Toolbar.module.css';

const Toolbar = ({
  isDrawing,
  onCancelDrawing,
  onStartDrawing,
  onFinishDrawing,
  drawingPointsCount
}) => {
  return (
    <div className={styles.tools}>
      <h3 className={styles.sectionTitle}>Инструменты</h3>
      <div className={styles.toolButtons}>
        <button disabled className={styles.toolButton}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
          <span>Удалить</span>
        </button>
        <button disabled className={styles.toolButton}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
          <span>Изменить</span>
        </button>
        <button onClick={isDrawing ? onCancelDrawing : onStartDrawing} className={`${styles.toolButton} ${isDrawing ? styles.active : ''}`}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11h-4v4h-2v-4H7v-2h4V7h2v4h4v2z"/></svg>
          <span>Добавить</span>
        </button>
      </div>
      {isDrawing && (
        <div className={styles.drawingControls}>
          <div className={styles.drawingButtons}>
            <button onClick={onFinishDrawing} className={`${styles.drawingButton} ${styles.finishButton}`}>Завершить</button>
            <button onClick={onCancelDrawing} className={`${styles.drawingButton} ${styles.cancelButton}`}>Отмена</button>
          </div>
          <div className={styles.drawingInfo}>
            <div>Точек: {drawingPointsCount}</div>
            <div>{drawingPointsCount < 3 ? 'Минимум 3 точки для полигона' : 'Кликните в начальную точку для завершения'}</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Toolbar;