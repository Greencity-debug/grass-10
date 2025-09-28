import React from 'react';
import styles from './FeatureModal.module.css';

const FeatureModal = ({
  isOpen,
  onClose,
  onSave,
  featureData,
  setFeatureData,
  shapeType,
  layers,
  sorts,
}) => {
  if (!isOpen) return null;

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFeatureData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (e) => {
    const { name, value } = e.target;
    const finalValue = name === 'age' ? parseInt(value, 10) : value;
    setFeatureData(prev => ({ ...prev, [name]: finalValue }));
  };

  const handleVarietyChange = (index, field, value) => {
    const updatedVarieties = [...featureData.flowerVarieties];
    updatedVarieties[index][field] = field === 'quantity' ? parseInt(value, 10) || 0 : value;
    setFeatureData(prev => ({ ...prev, flowerVarieties: updatedVarieties }));
  };

  const addVariety = () => {
    setFeatureData(prev => ({
      ...prev,
      flowerVarieties: [...prev.flowerVarieties, { sort_id: null, quantity: 1 }]
    }));
  };

  const removeVariety = (index) => {
    const updatedVarieties = featureData.flowerVarieties.filter((_, i) => i !== index);
    setFeatureData(prev => ({ ...prev, flowerVarieties: updatedVarieties }));
  };

  const ageOptions = Array.from({ length: 51 }, (_, i) => i);
  const typeName = shapeType ? shapeType.charAt(0).toUpperCase() + shapeType.slice(1) : '';

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h2 className={styles.title}>Карточка объекта: {typeName}</h2>

        <form className={styles.form}>
          <div className={styles.formGroupFull}>
            <label htmlFor="name" className={styles.label}>Название</label>
            <input type="text" id="name" name="name" value={featureData.name} onChange={handleInputChange} className={styles.input} placeholder={`Например, Участок №123`}/>
          </div>
          <div className={styles.formGroupFull}>
            <label htmlFor="description" className={styles.label}>Описание</label>
            <textarea id="description" name="description" value={featureData.description} onChange={handleInputChange} className={styles.textarea} placeholder="Дополнительная информация"/>
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="layer_id" className={styles.label}>Слой*</label>
            <select id="layer_id" name="layer_id" value={featureData.layer_id || ''} onChange={handleSelectChange} className={styles.select} required>
              <option value="" disabled>Выберите слой</option>
              {layers.map(layer => (<option key={layer.id} value={layer.id}>{layer.name}</option>))}
            </select>
          </div>

          {shapeType === 'tree' && (
            <>
              <div className={styles.formGroup}><label className={styles.label}>Координаты</label><input type="text" value={featureData.coordinates} readOnly className={styles.input}/></div>
              <div className={styles.formGroup}><label className={styles.label}>Сорт</label><select name="sort_id" value={featureData.sort_id || ''} onChange={handleSelectChange} className={styles.select}><option value="">Не выбрано</option>{sorts.map(s => (<option key={s.id} value={s.id}>{s.name}</option>))}</select></div>
              <div className={styles.formGroup}><label className={styles.label}>Возраст</label><select name="age" value={featureData.age} onChange={handleSelectChange} className={styles.select}>{ageOptions.map(a => (<option key={a} value={a}>{a}</option>))}</select></div>
            </>
          )}

          {shapeType === 'shrub' && (
            <>
              <div className={styles.formGroup}><label className={styles.label}>Длина</label><input type="text" value={featureData.length ? `${Math.round(featureData.length)} м` : ''} readOnly className={styles.input}/></div>
              <div className={styles.formGroup}><label className={styles.label}>Сорт</label><select name="sort_id" value={featureData.sort_id || ''} onChange={handleSelectChange} className={styles.select}><option value="">Не выбрано</option>{sorts.map(s => (<option key={s.id} value={s.id}>{s.name}</option>))}</select></div>
              <div className={styles.formGroup}><label className={styles.label}>Возраст</label><select name="age" value={featureData.age} onChange={handleSelectChange} className={styles.select}>{ageOptions.map(a => (<option key={a} value={a}>{a}</option>))}</select></div>
            </>
          )}

          {(shapeType === 'lawn' || shapeType === 'flowerbed' || shapeType === 'polygon') && (
            <>
              <div className={styles.formGroup}><label className={styles.label}>Площадь</label><input type="text" value={featureData.area ? `${Math.round(featureData.area)} м²` : ''} readOnly className={styles.input}/></div>
              {shapeType === 'lawn' && (
                <div className={styles.formGroup}><label className={styles.label}>Сорт</label><select name="sort_id" value={featureData.sort_id || ''} onChange={handleSelectChange} className={styles.select}><option value="">Не выбрано</option>{sorts.map(s => (<option key={s.id} value={s.id}>{s.name}</option>))}</select></div>
              )}
            </>
          )}

          {shapeType === 'flowerbed' && (
            <div className={styles.formGroupFull}>
              <label className={styles.label}>Сорта цветов</label>
              {featureData.flowerVarieties.map((variety, index) => (
                <div key={index} className={styles.varietyRow}>
                  <select value={variety.sort_id || ''} onChange={(e) => handleVarietyChange(index, 'sort_id', e.target.value)} className={styles.varietySelect}>
                    <option value="" disabled>Выберите сорт</option>
                    {sorts.map(s => (<option key={s.id} value={s.id}>{s.name}</option>))}
                  </select>
                  <input type="number" value={variety.quantity} onChange={(e) => handleVarietyChange(index, 'quantity', e.target.value)} className={styles.varietyQuantity} placeholder="Кол-во"/>
                  <button type="button" onClick={() => removeVariety(index)} className={styles.removeVarietyBtn}>-</button>
                </div>
              ))}
              <button type="button" onClick={addVariety} className={styles.addVarietyBtn}>+ Добавить сорт</button>
            </div>
          )}

          <div className={styles.formGroup}>
            <label htmlFor="created_at" className={styles.label}>Дата создания</label>
            <input type="date" id="created_at" name="created_at" value={featureData.created_at} onChange={handleInputChange} className={styles.input}/>
          </div>

          <div className={styles.buttonGroup}>
            <button type="button" onClick={onClose} className={`${styles.button} ${styles.secondary}`}>Отмена</button>
            <button type="button" onClick={onSave} className={`${styles.button} ${styles.primary}`}>Сохранить</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default FeatureModal;