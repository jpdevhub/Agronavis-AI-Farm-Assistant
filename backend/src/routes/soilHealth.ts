import { Router, Request, Response } from 'express';
import { SoilHealthService } from '../services/soilHealthService';
import { FarmService } from '../services/farmService';


const router = Router();

// Apply authentication middleware to all routes

// GET /api/soil-health - Get all soil health records for the authenticated user
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const records = await SoilHealthService.getSoilHealthByFarmerId(userId);
    res.json(records);
  } catch (error) {
    console.error('Error fetching soil health records:', error);
    res.status(500).json({ error: 'Failed to fetch soil health records' });
  }
});

// GET /api/soil-health/:id - Get a specific soil health record by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const recordId = req.params.id;
    
    const record = await SoilHealthService.getSoilHealthById(recordId);
    if (!record) {
      return res.status(404).json({ error: 'Soil health record not found' });
    }
    
    // Check if the record belongs to a farm owned by the user
    const farm = await FarmService.getFarmById(record.farm_id);
    if (!farm || farm.farmer_id !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    res.json(record);
  } catch (error) {
    console.error('Error fetching soil health record:', error);
    res.status(500).json({ error: 'Failed to fetch soil health record' });
  }
});

// POST /api/soil-health - Create a new soil health record
router.post('/', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const recordData = req.body;
    
    // Verify the farm belongs to the user before creating record
    const farm = await FarmService.getFarmById(recordData.farm_id);
    if (!farm || farm.farmer_id !== userId) {
      return res.status(404).json({ error: 'Farm not found or access denied' });
    }
    
    const record = await SoilHealthService.createSoilHealth(recordData);
    res.status(201).json(record);
  } catch (error) {
    console.error('Error creating soil health record:', error);
    res.status(500).json({ error: 'Failed to create soil health record' });
  }
});

// PUT /api/soil-health/:id - Update a soil health record
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const recordId = req.params.id;
    const updateData = req.body;
    
    // Check if record exists and belongs to user
    const existingRecord = await SoilHealthService.getSoilHealthById(recordId);
    if (!existingRecord) {
      return res.status(404).json({ error: 'Soil health record not found' });
    }
    
    const farm = await FarmService.getFarmById(existingRecord.farm_id);
    if (!farm || farm.farmer_id !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const record = await SoilHealthService.updateSoilHealth(recordId, updateData);
    res.json(record);
  } catch (error) {
    console.error('Error updating soil health record:', error);
    res.status(500).json({ error: 'Failed to update soil health record' });
  }
});

// DELETE /api/soil-health/:id - Delete a soil health record
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const recordId = req.params.id;
    
    // Check if record exists and belongs to user
    const existingRecord = await SoilHealthService.getSoilHealthById(recordId);
    if (!existingRecord) {
      return res.status(404).json({ error: 'Soil health record not found' });
    }
    
    const farm = await FarmService.getFarmById(existingRecord.farm_id);
    if (!farm || farm.farmer_id !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    await SoilHealthService.deleteSoilHealth(recordId);
    res.json({ message: 'Soil health record deleted successfully' });
  } catch (error) {
    console.error('Error deleting soil health record:', error);
    res.status(500).json({ error: 'Failed to delete soil health record' });
  }
});

// GET /api/soil-health/farm/:farmId - Get all soil health records for a specific farm
router.get('/farm/:farmId', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const farmId = req.params.farmId;
    
    // Verify farm ownership
    const farm = await FarmService.getFarmById(farmId);
    if (!farm || farm.farmer_id !== userId) {
      return res.status(404).json({ error: 'Farm not found or access denied' });
    }
    
    const records = await SoilHealthService.getSoilHealthByFarmId(farmId);
    res.json(records);
  } catch (error) {
    console.error('Error fetching soil health records by farm:', error);
    res.status(500).json({ error: 'Failed to fetch soil health records' });
  }
});

// GET /api/soil-health/farm/:farmId/latest - Get latest soil health record for a farm
router.get('/farm/:farmId/latest', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const farmId = req.params.farmId;
    
    // Verify farm ownership
    const farm = await FarmService.getFarmById(farmId);
    if (!farm || farm.farmer_id !== userId) {
      return res.status(404).json({ error: 'Farm not found or access denied' });
    }
    
    const record = await SoilHealthService.getLatestSoilHealth(farmId);
    if (!record) {
      return res.status(404).json({ error: 'No soil health records found for this farm' });
    }
    
    res.json(record);
  } catch (error) {
    console.error('Error fetching latest soil health record:', error);
    res.status(500).json({ error: 'Failed to fetch latest soil health record' });
  }
});

// GET /api/soil-health/analytics/trends/:farmId - Get soil health trends for a farm
router.get('/analytics/trends/:farmId', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const farmId = req.params.farmId;
    
    // Verify farm ownership
    const farm = await FarmService.getFarmById(farmId);
    if (!farm || farm.farmer_id !== userId) {
      return res.status(404).json({ error: 'Farm not found or access denied' });
    }
    
    const trends = await SoilHealthService.getSoilHealthTrend(farmId);
    res.json(trends);
  } catch (error) {
    console.error('Error fetching soil health trends:', error);
    res.status(500).json({ error: 'Failed to fetch soil health trends' });
  }
});

// GET /api/soil-health/analytics/summary - Get soil health analytics summary
router.get('/analytics/summary', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const analytics = await SoilHealthService.getSoilHealthAnalytics(userId);
    res.json(analytics);
  } catch (error) {
    console.error('Error fetching soil health analytics:', error);
    res.status(500).json({ error: 'Failed to fetch soil health analytics' });
  }
});

export default router;