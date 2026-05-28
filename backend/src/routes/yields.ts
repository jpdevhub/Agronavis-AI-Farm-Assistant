import { Router, Request, Response } from 'express';
import { YieldService } from '../services/yieldService';
import { FarmService } from '../services/farmService';


const router = Router();

// Apply authentication middleware to all routes

// GET /api/yields - Get all yield records for the authenticated user
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const yields = await YieldService.getYieldsByFarmerId(userId);
    res.json(yields);
  } catch (error) {
    console.error('Error fetching yield records:', error);
    res.status(500).json({ error: 'Failed to fetch yield records' });
  }
});

// GET /api/yields/:id - Get a specific yield record by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const yieldId = req.params.id;
    
    const yieldRecord = await YieldService.getYieldById(yieldId);
    if (!yieldRecord) {
      return res.status(404).json({ error: 'Yield record not found' });
    }
    
    // Check if the yield record belongs to a farm owned by the user
    const farm = await FarmService.getFarmById(yieldRecord.farm_id);
    if (!farm || farm.farmer_id !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    res.json(yieldRecord);
  } catch (error) {
    console.error('Error fetching yield record:', error);
    res.status(500).json({ error: 'Failed to fetch yield record' });
  }
});

// POST /api/yields - Create a new yield record
router.post('/', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const yieldData = req.body;
    
    // Verify the farm belongs to the user before creating yield record
    const farm = await FarmService.getFarmById(yieldData.farm_id);
    if (!farm || farm.farmer_id !== userId) {
      return res.status(404).json({ error: 'Farm not found or access denied' });
    }
    
    const yieldRecord = await YieldService.createYieldRecord(yieldData);
    res.status(201).json(yieldRecord);
  } catch (error) {
    console.error('Error creating yield record:', error);
    res.status(500).json({ error: 'Failed to create yield record' });
  }
});

// PUT /api/yields/:id - Update a yield record
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const yieldId = req.params.id;
    const updateData = req.body;
    
    // Check if yield record exists and belongs to user
    const existingYield = await YieldService.getYieldById(yieldId);
    if (!existingYield) {
      return res.status(404).json({ error: 'Yield record not found' });
    }
    
    const farm = await FarmService.getFarmById(existingYield.farm_id);
    if (!farm || farm.farmer_id !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const yieldRecord = await YieldService.updateYieldRecord(yieldId, updateData);
    res.json(yieldRecord);
  } catch (error) {
    console.error('Error updating yield record:', error);
    res.status(500).json({ error: 'Failed to update yield record' });
  }
});

// DELETE /api/yields/:id - Delete a yield record
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const yieldId = req.params.id;
    
    // Check if yield record exists and belongs to user
    const existingYield = await YieldService.getYieldById(yieldId);
    if (!existingYield) {
      return res.status(404).json({ error: 'Yield record not found' });
    }
    
    const farm = await FarmService.getFarmById(existingYield.farm_id);
    if (!farm || farm.farmer_id !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    await YieldService.deleteYieldRecord(yieldId);
    res.json({ message: 'Yield record deleted successfully' });
  } catch (error) {
    console.error('Error deleting yield record:', error);
    res.status(500).json({ error: 'Failed to delete yield record' });
  }
});

// GET /api/yields/farm/:farmId - Get all yield records for a specific farm
router.get('/farm/:farmId', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const farmId = req.params.farmId;
    
    // Verify farm ownership
    const farm = await FarmService.getFarmById(farmId);
    if (!farm || farm.farmer_id !== userId) {
      return res.status(404).json({ error: 'Farm not found or access denied' });
    }
    
    const yields = await YieldService.getYieldsByFarmId(farmId);
    res.json(yields);
  } catch (error) {
    console.error('Error fetching yield records by farm:', error);
    res.status(500).json({ error: 'Failed to fetch yield records' });
  }
});

// GET /api/yields/crop/:cropType - Get all yield records for a specific crop type
router.get('/crop/:cropType', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const cropType = req.params.cropType;
    
    const yields = await YieldService.getYieldsByCropType(userId, cropType);
    res.json(yields);
  } catch (error) {
    console.error('Error fetching yield records by crop type:', error);
    res.status(500).json({ error: 'Failed to fetch yield records by crop type' });
  }
});

// GET /api/yields/season/:season - Get yield records by season
router.get('/season/:season', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const season = req.params.season;
    
    const yields = await YieldService.getYieldsBySeason(userId, season);
    res.json(yields);
  } catch (error) {
    console.error('Error fetching yield records by season:', error);
    res.status(500).json({ error: 'Failed to fetch yield records by season' });
  }
});

// GET /api/yields/analytics/summary - Get yield analytics summary
router.get('/analytics/summary', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const analytics = await YieldService.getYieldAnalytics(userId);
    res.json(analytics);
  } catch (error) {
    console.error('Error fetching yield analytics:', error);
    res.status(500).json({ error: 'Failed to fetch yield analytics' });
  }
});

// GET /api/yields/analytics/trends/:cropType - Get yield trends for a crop type
router.get('/analytics/trends/:cropType', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const cropType = req.params.cropType;
    
    const trends = await YieldService.getCropYieldTrend(userId, cropType);
    res.json(trends);
  } catch (error) {
    console.error('Error fetching yield trends:', error);
    res.status(500).json({ error: 'Failed to fetch yield trends' });
  }
});

export default router;