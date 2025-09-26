import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import length from '@turf/length';
import area from '@turf/area';

export const useFeatureEditor = (layers) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [featureData, setFeatureData] = useState(null);
    const [shapeType, setShapeType] = useState(null);
    const [geometryType, setGeometryType] = useState(null);
    const [sorts, setSorts] = useState([]);
    const [isEditing, setIsEditing] = useState(false); // To track if we are editing or creating

    // Function to open the modal for a NEW feature
    const openNewFeatureModal = useCallback((layer, type) => {
        layer.remove();
        setIsEditing(false);

        const geometry = layer.toGeoJSON().geometry;
        let initialShapeType = null;
        let calculatedLength = null;
        let calculatedArea = null;

        setGeometryType(type);

        switch (type) {
            case 'Marker': initialShapeType = 'tree'; break;
            case 'Polyline':
                initialShapeType = 'shrub';
                calculatedLength = length(geometry, { units: 'meters' });
                break;
            case 'Polygon':
                initialShapeType = 'polygon';
                calculatedArea = area(geometry);
                break;
            default: console.error("Unknown shape type:", type); return;
        }

        setShapeType(initialShapeType);
        setFeatureData({
            name: '',
            description: '',
            layer_id: null,
            age: 0,
            sort_id: null,
            created_at: new Date().toISOString().split('T')[0],
            geometry: geometry,
            flowerVarieties: [{ sort_id: null, quantity: 1 }],
            coordinates: type === 'Marker' ? `${geometry.coordinates[1].toFixed(6)}, ${geometry.coordinates[0].toFixed(6)}` : null,
            length: calculatedLength ? `${calculatedLength.toFixed(2)} м` : null,
            area: calculatedArea ? `${(calculatedArea / 10000).toFixed(4)} га` : null,
        });
        setIsModalOpen(true);
    }, []);

    // Function to open the modal for an EXISTING feature
    const openEditFeatureModal = useCallback(async (featureId) => {
        setIsEditing(true);
        const { data, error } = await supabase
            .from('features')
            .select('*, feature_varieties(*)')
            .eq('id', featureId)
            .single();

        if (error) {
            console.error("Error fetching feature to edit:", error);
            alert("Не удалось загрузить данные объекта для редактирования.");
            return;
        }

        const geometry = data.geometry;
        setShapeType(data.type);
        setGeometryType(geometry.type);
        setFeatureData({
            ...data,
            flowerVarieties: data.feature_varieties.length > 0 ? data.feature_varieties : [{ sort_id: null, quantity: 1 }],
            coordinates: geometry.type === 'Point' ? `${geometry.coordinates[1].toFixed(6)}, ${geometry.coordinates[0].toFixed(6)}` : null,
            length: data.length ? `${data.length.toFixed(2)} м` : null,
            area: data.area ? `${(data.area).toFixed(4)} га` : null,
        });
        setIsModalOpen(true);
    }, []);


    useEffect(() => {
        if (geometryType === 'Polygon' && featureData?.layer_id && layers) {
            const selectedLayer = layers.find(l => l.id === featureData.layer_id);
            if (selectedLayer) {
                if (selectedLayer.name.toLowerCase().includes('газон')) setShapeType('lawn');
                else if (selectedLayer.name.toLowerCase().includes('клумб')) setShapeType('flowerbed');
                else setShapeType('polygon');
            }
        }
    }, [featureData?.layer_id, layers, geometryType]);

    useEffect(() => {
        if (isModalOpen && shapeType) {
            let typeForSorts = shapeType === 'flowerbed' ? 'flower' : shapeType;
            const fetchSorts = async () => {
                const { data, error } = await supabase.from('sorts').select('id, name').eq('type', typeForSorts);
                if (error) console.error(`Error fetching sorts for type ${typeForSorts}:`, error);
                else setSorts(data || []);
            };
            fetchSorts();
        }
    }, [isModalOpen, shapeType]);

    const closeFeatureModal = useCallback(() => {
        setIsModalOpen(false);
        setFeatureData(null);
        setShapeType(null);
        setSorts([]);
        setGeometryType(null);
        setIsEditing(false);
    }, []);

    const saveFeature = useCallback(async () => {
        if (!featureData || !featureData.layer_id) {
            alert('Необходимо выбрать слой.');
            return false;
        }

        const dataToSave = {
            id: isEditing ? featureData.id : undefined,
            name: featureData.name.trim() || `${shapeType} auto-gen`,
            description: featureData.description,
            layer_id: featureData.layer_id,
            geometry: featureData.geometry,
            type: shapeType,
            age: (shapeType === 'tree' || shapeType === 'shrub') ? featureData.age : null,
            sort_id: (shapeType !== 'flowerbed') ? featureData.sort_id : null,
            created_at: featureData.created_at,
            length: featureData.length ? parseFloat(featureData.length) : null,
            area: featureData.area ? parseFloat(featureData.area) : null,
        };

        const { data: savedFeature, error } = await supabase.from('features').upsert(dataToSave).select().single();

        if (error) {
            console.error('Ошибка сохранения объекта:', error);
            alert(`Не удалось сохранить объект: ${error.message}`);
            return false;
        }

        if (shapeType === 'flowerbed') {
            // Delete old varieties first
            await supabase.from('feature_varieties').delete().eq('feature_id', savedFeature.id);
            const varietiesToSave = featureData.flowerVarieties.filter(v => v.sort_id && v.quantity > 0).map(v => ({ feature_id: savedFeature.id, sort_id: v.sort_id, quantity: v.quantity }));
            if (varietiesToSave.length > 0) {
                const { error: varietiesError } = await supabase.from('feature_varieties').insert(varietiesToSave);
                if (varietiesError) console.error('Ошибка сохранения сортов клумбы:', varietiesError);
            }
        }

        if (dataToSave.name.includes('auto-gen')) {
            const updatedName = dataToSave.name.replace('auto-gen', `№${savedFeature.id.substring(0, 4)}`);
            await supabase.from('features').update({ name: updatedName }).eq('id', savedFeature.id);
        }

        alert('Объект успешно сохранен!');
        closeFeatureModal();
        return true;

    }, [featureData, shapeType, closeFeatureModal, isEditing]);

    const deleteFeature = async (featureId) => {
        if (!confirm("Вы уверены, что хотите удалить этот объект?")) return false;

        const { error } = await supabase.from('features').delete().eq('id', featureId);

        if (error) {
            alert(`Ошибка удаления: ${error.message}`);
            return false;
        }
        alert("Объект удален.");
        return true;
    };

    const updateFeatureGeometry = async (featureId, newGeometry) => {
        const { error } = await supabase.from('features').update({ geometry: newGeometry }).eq('id', featureId);
        if (error) {
            alert(`Не удалось обновить геометрию: ${error.message}`);
        }
    };

    return {
        isModalOpen,
        isEditing,
        featureData,
        shapeType,
        sorts,
        openNewFeatureModal,
        openEditFeatureModal,
        closeFeatureModal,
        saveFeature,
        deleteFeature,
        updateFeatureGeometry,
        setFeatureData
    };
};