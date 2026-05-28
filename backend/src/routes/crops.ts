import { Router, Request, Response } from 'express';
import { CropService } from '../services/cropService';
import { FarmService } from '../services/farmService';

const router = Router();
// Note: auth is enforced at the app.ts level via authenticateSupabase middleware


// GET /api/crops - Get all crops for the authenticated user
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const crops = await CropService.getCropsByFarmerId(userId);
    res.json(crops);
  } catch (error) {
    console.error('Error fetching crops:', error);
    res.status(500).json({ error: 'Failed to fetch crops' });
  }
});

// GET /api/crops/:id - Get a specific crop by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const cropId = req.params.id;
    
    const crop = await CropService.getCropById(cropId);
    if (!crop) {
      return res.status(404).json({ error: 'Crop not found' });
    }
    
    // Check if the crop belongs to a farm owned by the user
    const farm = await FarmService.getFarmById(crop.farm_id);
    if (!farm || farm.farmer_id !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    res.json(crop);
  } catch (error) {
    console.error('Error fetching crop:', error);
    res.status(500).json({ error: 'Failed to fetch crop' });
  }
});

// POST /api/crops - Create a new crop
router.post('/', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const cropData = req.body;
    
    // Verify the farm belongs to the user before creating crop
    const farm = await FarmService.getFarmById(cropData.farm_id);
    if (!farm || farm.farmer_id !== userId) {
      return res.status(404).json({ error: 'Farm not found or access denied' });
    }
    
    const crop = await CropService.createCrop(cropData);
    res.status(201).json(crop);
  } catch (error) {
    console.error('Error creating crop:', error);
    res.status(500).json({ error: 'Failed to create crop' });
  }
});

// PUT /api/crops/:id - Update a crop
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const cropId = req.params.id;
    const updateData = req.body;
    
    // Check if crop exists and belongs to user
    const existingCrop = await CropService.getCropById(cropId);
    if (!existingCrop) {
      return res.status(404).json({ error: 'Crop not found' });
    }
    
    const farm = await FarmService.getFarmById(existingCrop.farm_id);
    if (!farm || farm.farmer_id !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const crop = await CropService.updateCrop(cropId, updateData);
    res.json(crop);
  } catch (error) {
    console.error('Error updating crop:', error);
    res.status(500).json({ error: 'Failed to update crop' });
  }
});

// DELETE /api/crops/:id - Delete a crop
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const cropId = req.params.id;
    
    // Check if crop exists and belongs to user
    const existingCrop = await CropService.getCropById(cropId);
    if (!existingCrop) {
      return res.status(404).json({ error: 'Crop not found' });
    }
    
    const farm = await FarmService.getFarmById(existingCrop.farm_id);
    if (!farm || farm.farmer_id !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    await CropService.deleteCrop(cropId);
    res.json({ message: 'Crop deleted successfully' });
  } catch (error) {
    console.error('Error deleting crop:', error);
    res.status(500).json({ error: 'Failed to delete crop' });
  }
});

// GET /api/crops/farm/:farmId - Get all crops for a specific farm
router.get('/farm/:farmId', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const farmId = req.params.farmId;
    
    // Verify farm ownership
    const farm = await FarmService.getFarmById(farmId);
    if (!farm || farm.farmer_id !== userId) {
      return res.status(404).json({ error: 'Farm not found or access denied' });
    }
    
    const crops = await CropService.getCropsByFarmId(farmId);
    res.json(crops);
  } catch (error) {
    console.error('Error fetching crops by farm:', error);
    res.status(500).json({ error: 'Failed to fetch crops' });
  }
});

// GET /api/crops/analytics/summary - Get crop analytics summary
router.get('/analytics/summary', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const analytics = await CropService.getCropAnalytics(userId);
    res.json(analytics);
  } catch (error) {
    console.error('Error fetching crop analytics:', error);
    res.status(500).json({ error: 'Failed to fetch crop analytics' });
  }
});

export default router;