import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export const useLayers = () => {
  const [layers, setLayers] = useState([]);
  const [showCreateLayerModal, setShowCreateLayerModal] = useState(false);
  const [showEditLayerModal, setShowEditLayerModal] = useState(false);
  const [editingLayer, setEditingLayer] = useState(null);
  const [layerVisibility, setLayerVisibility] = useState({});
  const [draggedLayer, setDraggedLayer] = useState(null);
  const [newLayerData, setNewLayerData] = useState({ name: '', color: '#4CAF50' });

  const loadLayers = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('layers')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Ошибка загрузки слоёв:', error);
        return;
      }

      if (data) {
        setLayers(data);
        const visibility = {};
        data.forEach(layer => {
          visibility[layer.id] = true;
        });
        setLayerVisibility(visibility);
      }
    } catch (err) {
      console.error('Критическая ошибка:', err);
    }
  }, []);

  useEffect(() => {
    loadLayers();
  }, [loadLayers]);

  const handleDragStart = (e, layer) => {
    setDraggedLayer(layer);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e, targetLayer) => {
    e.preventDefault();
    if (!draggedLayer || draggedLayer.id === targetLayer.id) {
      setDraggedLayer(null);
      return;
    }
    const currentLayers = [...layers];
    const draggedIndex = currentLayers.findIndex(l => l.id === draggedLayer.id);
    const targetIndex = currentLayers.findIndex(l => l.id === targetLayer.id);
    const [draggedItem] = currentLayers.splice(draggedIndex, 1);
    currentLayers.splice(targetIndex, 0, draggedItem);
    setLayers(currentLayers);
    setDraggedLayer(null);
  };

  const openCreateLayerModal = () => {
    setNewLayerData({ name: '', color: '#4CAF50' });
    setShowCreateLayerModal(true);
  };

  const closeCreateLayerModal = () => setShowCreateLayerModal(false);

  const openEditLayerModal = (layer) => {
    setEditingLayer(layer);
    setNewLayerData({ name: layer.name, color: layer.color });
    setShowEditLayerModal(true);
  };

  const closeEditLayerModal = () => {
    setShowEditLayerModal(false);
    setEditingLayer(null);
    setNewLayerData({ name: '', color: '#4CAF50' });
  };

  const saveNewLayer = async () => {
    if (!newLayerData.name.trim()) {
      alert('Введите название слоя');
      return;
    }
    const { error } = await supabase.from('layers').insert({
      name: newLayerData.name,
      color: newLayerData.color,
    });
    if (error) {
      alert('Ошибка создания слоя');
    } else {
      alert('Слой успешно создан');
      closeCreateLayerModal();
      loadLayers();
    }
  };

  const saveEditedLayer = async () => {
    if (!newLayerData.name.trim() || !editingLayer) return;
    const { error } = await supabase.from('layers').update({
      name: newLayerData.name,
      color: newLayerData.color,
    }).eq('id', editingLayer.id);
    if (error) {
      alert('Ошибка редактирования слоя');
    } else {
      alert('Слой успешно обновлён');
      closeEditLayerModal();
      loadLayers();
    }
  };

  const deleteLayer = async (layer) => {
    if (!confirm(`Удалить слой "${layer.name}"? Все полигоны этого слоя тоже будут удалены.`)) return;
    const { error } = await supabase.from('layers').delete().eq('id', layer.id);
    if (error) {
      alert('Ошибка удаления слоя');
    } else {
      alert('Слой успешно удалён');
      loadLayers();
    }
  };

  const toggleLayerVisibility = (layerId) => {
    setLayerVisibility(prev => ({
      ...prev,
      [layerId]: !prev[layerId],
    }));
  };

  return {
    layers, layerVisibility, showCreateLayerModal, showEditLayerModal, newLayerData,
    setNewLayerData, handleDragStart, handleDragOver, handleDrop, openCreateLayerModal,
    closeCreateLayerModal, openEditLayerModal, closeEditLayerModal, saveNewLayer,
    saveEditedLayer, deleteLayer, toggleLayerVisibility,
  };
};