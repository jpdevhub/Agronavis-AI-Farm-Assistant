import { supabase } from '../lib/supabase';

export const getFarmData = async () => {
    const { data, error } = await supabase
        .from('farms')
        .select('*');
    if (error) throw new Error(error.message);
    return data;
};

export const getCropData = async (farmId: string) => {
    const { data, error } = await supabase
        .from('crops')
        .select('*')
        .eq('farm_id', farmId);
    if (error) throw new Error(error.message);
    return data;
};

export const addCropData = async (cropData: any) => {
    const { data, error } = await supabase
        .from('crops')
        .insert(cropData);
    if (error) throw new Error(error.message);
    return data;
};

export const updateCropData = async (cropId: string, cropData: any) => {
    const { data, error } = await supabase
        .from('crops')
        .update(cropData)
        .eq('id', cropId);
    if (error) throw new Error(error.message);
    return data;
};

export const deleteCropData = async (cropId: string) => {
    const { data, error } = await supabase
        .from('crops')
        .delete()
        .eq('id', cropId);
    if (error) throw new Error(error.message);
    return data;
};