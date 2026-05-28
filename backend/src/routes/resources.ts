import { Router, Request, Response } from 'express';
import { ResourceService } from '../services/resourceService';
import { FarmService } from '../services/farmService';


const router = Router();

// Apply authentication middleware to all routes

// GET /api/resources - Get all resources for the authenticated user
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const resources = await ResourceService.getResourcesByFarmerId(userId);
    res.json(resources);
  } catch (error) {
    console.error('Error fetching resources:', error);
    res.status(500).json({ error: 'Failed to fetch resources' });
  }
});

// GET /api/resources/:id - Get a specific resource by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const resourceId = req.params.id;
    
    const resource = await ResourceService.getResourceById(resourceId);
    if (!resource) {
      return res.status(404).json({ error: 'Resource not found' });
    }
    
    // Check if the resource belongs to a farm owned by the user
    const farm = await FarmService.getFarmById(resource.farm_id);
    if (!farm || farm.farmer_id !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    res.json(resource);
  } catch (error) {
    console.error('Error fetching resource:', error);
    res.status(500).json({ error: 'Failed to fetch resource' });
  }
});

// POST /api/resources - Create a new resource
router.post('/', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const resourceData = req.body;
    
    // Verify the farm belongs to the user before creating resource
    const farm = await FarmService.getFarmById(resourceData.farm_id);
    if (!farm || farm.farmer_id !== userId) {
      return res.status(404).json({ error: 'Farm not found or access denied' });
    }
    
    const resource = await ResourceService.createResource(resourceData);
    res.status(201).json(resource);
  } catch (error) {
    console.error('Error creating resource:', error);
    res.status(500).json({ error: 'Failed to create resource' });
  }
});

// PUT /api/resources/:id - Update a resource
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const resourceId = req.params.id;
    const updateData = req.body;
    
    // Check if resource exists and belongs to user
    const existingResource = await ResourceService.getResourceById(resourceId);
    if (!existingResource) {
      return res.status(404).json({ error: 'Resource not found' });
    }
    
    const farm = await FarmService.getFarmById(existingResource.farm_id);
    if (!farm || farm.farmer_id !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const resource = await ResourceService.updateResource(resourceId, updateData);
    res.json(resource);
  } catch (error) {
    console.error('Error updating resource:', error);
    res.status(500).json({ error: 'Failed to update resource' });
  }
});

// DELETE /api/resources/:id - Delete a resource
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const resourceId = req.params.id;
    
    // Check if resource exists and belongs to user
    const existingResource = await ResourceService.getResourceById(resourceId);
    if (!existingResource) {
      return res.status(404).json({ error: 'Resource not found' });
    }
    
    const farm = await FarmService.getFarmById(existingResource.farm_id);
    if (!farm || farm.farmer_id !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    await ResourceService.deleteResource(resourceId);
    res.json({ message: 'Resource deleted successfully' });
  } catch (error) {
    console.error('Error deleting resource:', error);
    res.status(500).json({ error: 'Failed to delete resource' });
  }
});

// GET /api/resources/farm/:farmId - Get all resources for a specific farm
router.get('/farm/:farmId', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const farmId = req.params.farmId;
    
    // Verify farm ownership
    const farm = await FarmService.getFarmById(farmId);
    if (!farm || farm.farmer_id !== userId) {
      return res.status(404).json({ error: 'Farm not found or access denied' });
    }
    
    const resources = await ResourceService.getResourcesByFarmId(farmId);
    res.json(resources);
  } catch (error) {
    console.error('Error fetching resources by farm:', error);
    res.status(500).json({ error: 'Failed to fetch resources' });
  }
});

// GET /api/resources/type/:type - Get resources by type
router.get('/type/:type', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const resourceType = req.params.type;
    
    const resources = await ResourceService.getResourcesByType(userId, resourceType);
    res.json(resources);
  } catch (error) {
    console.error('Error fetching resources by type:', error);
    res.status(500).json({ error: 'Failed to fetch resources by type' });
  }
});

// GET /api/resources/analytics/summary - Get resource analytics summary
router.get('/analytics/summary', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const analytics = await ResourceService.getResourceAnalytics(userId);
    res.json(analytics);
  } catch (error) {
    console.error('Error fetching resource analytics:', error);
    res.status(500).json({ error: 'Failed to fetch resource analytics' });
  }
});

export default router;