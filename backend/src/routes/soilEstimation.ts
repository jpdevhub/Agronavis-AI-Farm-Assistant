import { Router, Request, Response } from 'express';
import { supabase } from '../lib/supabase';
import { FarmService } from '../services/farmService';

const router = Router();

/**
 * POST /api/soil-estimation/estimate
 * Takes { farmId, state, district }
 * 1. Calls get_estimated_soil_health RPC for category + kg/acre estimates
 * 2. Calls insert_estimated_soil_history RPC to auto-persist into soil_health_history
 * 3. Returns both the estimation data and the new history record ID
 */
router.post('/estimate', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { farmId, state, district } = req.body;

    if (!farmId || !state || !district) {
      return res.status(400).json({
        success: false,
        error: 'farmId, state, and district are required'
      });
    }

    // Verify farm ownership
    const farm = await FarmService.getFarmById(farmId);
    if (!farm || farm.farmer_id !== userId) {
      return res.status(404).json({
        success: false,
        error: 'Farm not found or access denied'
      });
    }

    // Step 1: Normalize state and district to match CSV quirks
    // The CSV has a typo "UTTAR PRRADESH" and districts don't contain the word "District"
    let normalizedState = state.toUpperCase().trim();
    if (normalizedState === 'UTTAR PRADESH') {
      normalizedState = 'UTTAR PRRADESH';
    }

    let normalizedDistrict = district.toUpperCase().replace(/\bDISTRICT\b/gi, '').trim();

    // Step 2: Get soil estimation from regional data
    const { data: estimation, error: estError } = await supabase
      .rpc('get_estimated_soil_health', {
        p_state: normalizedState,
        p_district: normalizedDistrict
      });

    if (estError) {
      console.error('Soil estimation RPC error:', estError);
      return res.status(404).json({
        success: false,
        error: `No soil data available for ${district}, ${state}. ${estError.message}`
      });
    }

    const estimationRow = Array.isArray(estimation) ? estimation[0] : estimation;

    if (!estimationRow) {
      return res.status(404).json({
        success: false,
        error: `No soil data found for ${district}, ${state}`
      });
    }

    // Step 3: Auto-insert into soil_health_history
    const { data: historyId, error: histError } = await supabase
      .rpc('insert_estimated_soil_history', {
        p_farm_id: farmId,
        p_state: normalizedState,
        p_district: normalizedDistrict
      });

    if (histError) {
      console.error('Soil history insert error:', histError);
      // Non-fatal — still return estimation even if insert fails
    }

    // Step 3: Update farm location JSONB with state/district for future reference
    try {
      const existingLocation = farm.location || {};
      await supabase
        .from('farms')
        .update({
          location: {
            ...existingLocation,
            state: state,
            district: district,
            soil_estimated: true,
            soil_estimated_at: new Date().toISOString()
          }
        })
        .eq('id', farmId);
    } catch (locError) {
      console.error('Location update error (non-fatal):', locError);
    }

    res.json({
      success: true,
      data: {
        estimation: estimationRow,
        soilHistoryId: historyId,
        farmId,
        state,
        district
      }
    });
  } catch (error: any) {
    console.error('Soil estimation error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to estimate soil health'
    });
  }
});

/**
 * GET /api/soil-estimation/fertilizer/:farmId
 * Returns fertilizer bag recommendations by querying:
 * 1. Latest soil_health_history for the farm
 * 2. Active crops on the farm
 * 3. crop_varieties for NPK requirements
 * Then computes Urea/SSP/MOP bags needed.
 */
router.get('/fertilizer/:farmId', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const farmId = req.params.farmId;

    // Verify farm ownership
    const farm = await FarmService.getFarmById(farmId);
    if (!farm || farm.farmer_id !== userId) {
      return res.status(404).json({
        success: false,
        error: 'Farm not found or access denied'
      });
    }

    // Get latest soil health
    const { data: soilData, error: soilErr } = await supabase
      .from('soil_health_history')
      .select('*')
      .eq('farm_id', farmId)
      .order('tested_date', { ascending: false })
      .limit(1)
      .single();

    if (soilErr || !soilData) {
      return res.status(404).json({
        success: false,
        error: 'No soil health data found. Draw your farm boundary to auto-estimate.'
      });
    }

    // Get active crops
    const { data: crops, error: cropErr } = await supabase
      .from('crops')
      .select(`
        id, crop_type, variety, area_allocated, current_growth_stage
      `)
      .eq('farm_id', farmId)
      .in('current_growth_stage', ['sowing', 'vegetative', 'germination']);

    if (cropErr) {
      console.error('Error fetching crops:', cropErr);
    }

    // Manually fetch variety details since there is no Foreign Key linking crops to crop_varieties
    const cropsWithVarieties = await Promise.all((crops || []).map(async (crop: any) => {
      if (crop.crop_type && crop.variety) {
        const { data: cvData } = await supabase
          .from('crop_varieties')
          .select('*')
          .eq('crop_type', crop.crop_type)
          .eq('variety', crop.variety)
          .limit(1)
          .single();
        
        return { ...crop, crop_varieties: cvData };
      }
      return { ...crop, crop_varieties: null };
    }));

    // Compute fertilizer recommendations for each crop
    const recommendations = cropsWithVarieties.map((crop: any) => {
      const cv = crop.crop_varieties;

      // If variety is missing from DB, use safe generic fallbacks
      const reqN = cv?.req_nitrogen_kg_per_acre || 120;
      const reqP = cv?.req_phosphorus_kg_per_acre || 40;
      const reqK = cv?.req_potassium_kg_per_acre || 60;
      const minPh = cv?.ideal_ph_min || 5.5;
      const maxPh = cv?.ideal_ph_max || 8.5;

      const nDeficit = Math.max(0, reqN - (soilData.nitrogen || 0));
      const pDeficit = Math.max(0, reqP - (soilData.phosphorus || 0));
      const kDeficit = Math.max(0, reqK - (soilData.potassium || 0));

      const area = crop.area_allocated || farm.total_area;

      // Urea: 46% N, 50kg bags. SSP: 16% P2O5, 50kg bags. MOP: 60% K2O, 50kg bags.
      const ureaBags = Math.ceil(((nDeficit * area) / 0.46) / 50);
      const sspBags = Math.ceil(((pDeficit * area) / 0.16) / 50);
      const mopBags = Math.ceil(((kDeficit * area) / 0.60) / 50);

      return {
        cropType: crop.crop_type,
        variety: crop.variety,
        areaAcres: area,
        nDeficitPerAcre: Math.round(nDeficit * 10) / 10,
        pDeficitPerAcre: Math.round(pDeficit * 10) / 10,
        kDeficitPerAcre: Math.round(kDeficit * 10) / 10,
        ureaBags,
        sspBags,
        mopBags,
        phAlert: soilData.ph_level < minPh || soilData.ph_level > maxPh
          ? `pH ${soilData.ph_level} is outside ideal range (${minPh}-${maxPh})`
          : null
      };
    }).filter(Boolean);

    res.json({
      success: true,
      data: {
        farm: {
          id: farm.id,
          name: farm.name,
          totalArea: farm.total_area,
          state: farm.location?.state,
          district: farm.location?.district
        },
        soilHealth: {
          nitrogen: soilData.nitrogen,
          phosphorus: soilData.phosphorus,
          potassium: soilData.potassium,
          ph: soilData.ph_level,
          testedDate: soilData.tested_date
        },
        recommendations,
        hasCrops: cropsWithVarieties.length > 0
      }
    });
  } catch (error: any) {
    console.error('Fertilizer recommendation error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get fertilizer recommendations'
    });
  }
});

export default router;
