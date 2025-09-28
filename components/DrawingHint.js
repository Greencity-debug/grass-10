import React from 'react';
import styles from './DrawingHint.module.css';

const DrawingHint = ({ text }) => {
  if (!text) {
    return null;
  }

  return (
    <div className={styles.hintOverlay}>
      {text}
    </div>
  );
};

export default DrawingHint;