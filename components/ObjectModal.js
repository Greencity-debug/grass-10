import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import Select from 'react-select'; // Импортируем react-select

const ObjectModal = ({ isOpen, onClose, onSave, onDelete, objectData, layers }) => {
  const [formData, setFormData] = useState({});
  const [lookupData, setLookupData] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (objectData) {
      const initialLayerId = objectData.layer_id || (layers && layers.length > 0 ? layers[0].id : '');
      const initialData = {
        ...objectData.properties,
        name: objectData.name || '',
        description: objectData.description || '',
        layer_id: initialLayerId,
        variety_ids: Array.isArray(objectData.properties?.variety_ids)
          ? objectData.properties.variety_ids
          : [],
      };
      setFormData(initialData);
    } else {
      setFormData({ variety_ids: [] });
    }
  }, [objectData, layers]);

  useEffect(() => {
    if (!isOpen) return;

    const fetchLookupData = async () => {
      setIsLoading(true);
      try {
        const [
          treeVarieties,
          flowerVarieties,
          shrubVarieties,
          smallArchitecturalFormTypes
        ] = await Promise.all([
          supabase.from('tree_varieties').select('*'),
          supabase.from('flower_varieties').select('*'),
          supabase.from('shrub_varieties').select('*'),
          supabase.from('small_architectural_form_types').select('*')
        ]);

        if (treeVarieties.error) throw treeVarieties.error;
        if (flowerVarieties.error) throw flowerVarieties.error;
        if (shrubVarieties.error) throw shrubVarieties.error;
        if (smallArchitecturalFormTypes.error) throw smallArchitecturalFormTypes.error;

        setLookupData({
          tree_varieties: treeVarieties.data || [],
          flower_varieties: flowerVarieties.data || [],
          shrub_varieties: shrubVarieties.data || [],
          small_architectural_form_types: smallArchitecturalFormTypes.data || [],
        });

      } catch (error) {
        console.error('Ошибка загрузки справочных данных:', error);
        alert('Не удалось загрузить справочные данные.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchLookupData();
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleMultiSelectChange = (selectedOptions) => {
    const ids = selectedOptions ? selectedOptions.map(option => option.value) : [];
    setFormData(prev => ({ ...prev, variety_ids: ids }));
  };

  const handleSubmit = () => {
    onSave(formData);
  };

  const handleDelete = () => {
    if (window.confirm('Вы уверены, что хотите удалить этот объект? Это действие необратимо.')) {
      onDelete();
    }
  };

  const renderDynamicFields = () => {
    if (isLoading || !formData.layer_id || !layers) return null;

    const selectedLayer = layers.find(l => l.id === formData.layer_id);
    if (!selectedLayer) return null;

    switch (selectedLayer.name) {
      case 'Деревья':
        return (
          <>
            <div style={styles.formGroup}>
              <label htmlFor="age">Возраст (лет)</label>
              <input
                type="number"
                id="age"
                name="age"
                value={formData.age || ''}
                onChange={handleChange}
                style={styles.input}
                placeholder="Введите возраст"
              />
            </div>
            <div style={styles.formGroup}>
              <label htmlFor="variety_id">Сорт дерева</label>
              <select
                id="variety_id"
                name="variety_id"
                value={formData.variety_id || ''}
                onChange={handleChange}
                style={styles.input}
              >
                <option value="">Выберите сорт</option>
                {lookupData.tree_varieties?.map(v => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </select>
            </div>
          </>
        );
      case 'Кустарники':
        return (
            <div style={styles.formGroup}>
              <label htmlFor="variety_id">Сорт кустарника</label>
              <select
                id="variety_id"
                name="variety_id"
                value={formData.variety_id || ''}
                onChange={handleChange}
                style={styles.input}
              >
                <option value="">Выберите сорт</option>
                {lookupData.shrub_varieties?.map(v => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </select>
            </div>
        );
      case 'Клумбы':
        const flowerOptions = lookupData.flower_varieties?.map(v => ({ value: v.id, label: v.name })) || [];
        const selectedFlowerValues = flowerOptions.filter(option => formData.variety_ids?.includes(option.value));
        return (
            <div style={styles.formGroup}>
              <label htmlFor="variety_ids">Состав клумбы</label>
              <Select
                id="variety_ids"
                name="variety_ids"
                isMulti
                options={flowerOptions}
                value={selectedFlowerValues}
                onChange={handleMultiSelectChange}
                placeholder="Выберите виды цветов..."
              />
            </div>
        );
      case 'Малые архитектурные формы':
        return (
            <div style={styles.formGroup}>
              <label htmlFor="type_id">Тип МАФ</label>
              <select
                id="type_id"
                name="type_id"
                value={formData.type_id || ''}
                onChange={handleChange}
                style={styles.input}
              >
                <option value="">Выберите тип</option>
                {lookupData.small_architectural_form_types?.map(t => (
                  <option key={t.id} value={t.id}>{t.type_name}</option>
                ))}
              </select>
            </div>
        );
      default:
        return null;
    }
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <h2>{objectData.id ? 'Редактировать объект' : 'Создать объект'}</h2>

        {isLoading ? (
          <p>Загрузка данных...</p>
        ) : (
          <>
            <div style={styles.formGroup}>
              <label htmlFor="name">Название</label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name || ''}
                onChange={handleChange}
                style={styles.input}
                placeholder="Название объекта"
              />
            </div>

            <div style={styles.formGroup}>
              <label htmlFor="description">Описание</label>
              <textarea
                id="description"
                name="description"
                value={formData.description || ''}
                onChange={handleChange}
                style={{...styles.input, height: '80px'}}
                placeholder="Дополнительная информация"
              />
            </div>

            <div style={styles.formGroup}>
              <label htmlFor="layer_id">Слой*</label>
              <select
                id="layer_id"
                name="layer_id"
                value={formData.layer_id || ''}
                onChange={handleChange}
                style={styles.input}
                required
                disabled={!!objectData.id} // Блокируем смену слоя при редактировании
              >
                <option value="" disabled>Выберите слой</option>
                {layers && layers.map(layer => (
                  <option key={layer.id} value={layer.id}>{layer.name}</option>
                ))}
              </select>
            </div>

            {renderDynamicFields()}

            {objectData.id && (
              <div style={styles.infoSection}>
                <p style={styles.infoText}><strong>ID:</strong> {objectData.id}</p>
                {objectData.layers?.name && (
                   <p style={styles.infoText}><strong>Слой:</strong> {objectData.layers.name}</p>
                )}
                {objectData.coordinates_str && (
                  <p style={styles.infoText}><strong>Координаты:</strong> {objectData.coordinates_str}</p>
                )}
                {objectData.area && (
                  <p style={styles.infoText}><strong>Площадь:</strong> {objectData.area}</p>
                )}
                {objectData.length && (
                  <p style={styles.infoText}><strong>Длина:</strong> {objectData.length}</p>
                )}
              </div>
            )}

            <div style={styles.buttonContainer}>
              <div>
                {objectData.id && (
                  <button onClick={handleDelete} style={{...styles.button, ...styles.deleteButton}}>
                    Удалить
                  </button>
                )}
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={onClose} style={{...styles.button, ...styles.cancelButton}}>Отмена</button>
                <button onClick={handleSubmit} style={{...styles.button, ...styles.saveButton}}>Сохранить</button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2000,
  },
  modal: {
    background: 'white',
    padding: '25px',
    borderRadius: '12px',
    width: '450px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
    display: 'flex',
    flexDirection: 'column',
    gap: '15px'
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '5px'
  },
  input: {
    width: '100%',
    padding: '10px',
    borderRadius: '6px',
    border: '1px solid #ccc',
    fontSize: '14px'
  },
  buttonContainer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '10px',
  },
  button: {
    padding: '10px 20px',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: '500'
  },
  saveButton: {
    backgroundColor: '#4A5D23',
    color: 'white',
  },
  cancelButton: {
    backgroundColor: '#ccc',
    color: '#333'
  },
  deleteButton: {
    backgroundColor: '#D32F2F',
    color: 'white',
  },
  infoSection: {
    marginTop: '15px',
    paddingTop: '10px',
    borderTop: '1px solid #eee',
  },
  infoText: {
    margin: '0 0 5px 0',
    fontSize: '12px',
    color: '#666',
  }
};

export default ObjectModal;