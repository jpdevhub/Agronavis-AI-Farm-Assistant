import express, { Request, Response } from 'express';
import { FarmService } from '../services/farmService';

const router = express.Router();


// GET /api/farms - Get all farms for current farmer
router.get('/', async (req: Request, res: Response) => {
  try {
    const farmerId = req.user?.id
    if (!farmerId) {
      return res.status(401).json({ success: false, error: 'User not authenticated' })
    }

    const farms = await FarmService.getFarmsByFarmerId(farmerId)
    res.json({ success: true, data: farms })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

// GET /api/farms/summary - Get farms summary with basic crop info
router.get('/summary', async (req: Request, res: Response) => {
  try {
    const farmerId = req.user?.id
    if (!farmerId) {
      return res.status(401).json({ success: false, error: 'User not authenticated' })
    }

    const summary = await FarmService.getFarmsSummary(farmerId)
    res.json({ success: true, data: summary })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

// GET /api/farms/:id - Get specific farm by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const farmerId = req.user?.id
    const farmId = req.params.id

    if (!farmerId) {
      return res.status(401).json({ success: false, error: 'User not authenticated' })
    }

    // Validate farm ownership
    const isOwner = await FarmService.validateFarmOwnership(farmId, farmerId)
    if (!isOwner) {
      return res.status(403).json({ success: false, error: 'Access denied to this farm' })
    }

    const farm = await FarmService.getFarmById(farmId)
    if (!farm) {
      return res.status(404).json({ success: false, error: 'Farm not found' })
    }

    res.json({ success: true, data: farm })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

// GET /api/farms/:id/details - Get farm with all related data
router.get('/:id/details', async (req: Request, res: Response) => {
  try {
    const farmerId = req.user?.id
    const farmId = req.params.id

    if (!farmerId) {
      return res.status(401).json({ success: false, error: 'User not authenticated' })
    }

    // Validate farm ownership
    const isOwner = await FarmService.validateFarmOwnership(farmId, farmerId)
    if (!isOwner) {
      return res.status(403).json({ success: false, error: 'Access denied to this farm' })
    }

    const farmDetails = await FarmService.getFarmWithDetails(farmId)
    if (!farmDetails) {
      return res.status(404).json({ success: false, error: 'Farm not found' })
    }

    res.json({ success: true, data: farmDetails })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

// POST /api/farms - Create new farm
router.post('/', async (req: Request, res: Response) => {
  try {
    const farmerId = req.user?.id
    if (!farmerId) {
      return res.status(401).json({ success: false, error: 'User not authenticated' })
    }

    const farmData = {
      farmer_id: farmerId,
      name: req.body.name,
      total_area: req.body.total_area,
      address: req.body.address,
      location: req.body.location || {},
      soil_type: req.body.soil_type,
      irrigation_type: req.body.irrigation_type,
      ownership_type: req.body.ownership_type
    }

    // Process location data if provided
    if (req.body.latitude && req.body.longitude) {
      farmData.location = {
        ...farmData.location,
        latitude: parseFloat(req.body.latitude),
        longitude: parseFloat(req.body.longitude)
      }
    }

    // Process polygon data if provided (from PolygonMapper)
    if (req.body.location?.polygon && Array.isArray(req.body.location.polygon)) {
      farmData.location = {
        ...farmData.location,
        polygon: req.body.location.polygon,
        coordinates_source: req.body.location.coordinates_source || 'polygon'
      }
    }

    // Validate required fields — total_area can be 0 (area is calculated later from polygon)
    if (!farmData.name) {
      return res.status(400).json({ 
        success: false, 
        error: 'Farm name is required' 
      })
    }
    
    // Validate coordinates if provided
    if (farmData.location?.latitude && 
        (farmData.location.latitude < -90 || farmData.location.latitude > 90)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Latitude must be between -90 and 90 degrees' 
      })
    }
    
    if (farmData.location?.longitude && 
        (farmData.location.longitude < -180 || farmData.location.longitude > 180)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Longitude must be between -180 and 180 degrees' 
      })
    }

    // Allow 0 — farm is created first, then area is calculated via Turf.js after polygon is drawn
    if (farmData.total_area < 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Total area cannot be negative' 
      })
    }

    const farm = await FarmService.createFarm(farmData)
    res.status(201).json({ success: true, data: farm })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

// PUT /api/farms/:id - Update farm
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const farmerId = req.user?.id
    const farmId = req.params.id

    if (!farmerId) {
      return res.status(401).json({ success: false, error: 'User not authenticated' })
    }

    // Validate farm ownership
    const isOwner = await FarmService.validateFarmOwnership(farmId, farmerId)
    if (!isOwner) {
      return res.status(403).json({ success: false, error: 'Access denied to this farm' })
    }

    const updates: any = {
      name: req.body.name,
      total_area: req.body.total_area,
      address: req.body.address,
      soil_type: req.body.soil_type,
      irrigation_type: req.body.irrigation_type,
      ownership_type: req.body.ownership_type
    }

    // Process location data if provided
    if (req.body.location || req.body.latitude || req.body.longitude) {
      // Get current location data first to merge with updates
      const currentFarm = await FarmService.getFarmById(farmId)
      const currentLocation = currentFarm?.location || {}
      
      updates.location = {
        ...currentLocation,
        ...(req.body.location || {})
      }
      
      // Process direct latitude/longitude if provided
      if (req.body.latitude) {
        updates.location.latitude = parseFloat(req.body.latitude)
      }
      
      if (req.body.longitude) {
        updates.location.longitude = parseFloat(req.body.longitude)
      }
      
      // Validate coordinates
      if (updates.location.latitude !== undefined && 
          (updates.location.latitude < -90 || updates.location.latitude > 90)) {
        return res.status(400).json({ 
          success: false, 
          error: 'Latitude must be between -90 and 90 degrees' 
        })
      }
      
      if (updates.location.longitude !== undefined && 
          (updates.location.longitude < -180 || updates.location.longitude > 180)) {
        return res.status(400).json({ 
          success: false, 
          error: 'Longitude must be between -180 and 180 degrees' 
        })
      }
    }

    // Remove undefined fields
    Object.keys(updates).forEach(key => {
      if (updates[key as keyof typeof updates] === undefined) {
        delete updates[key as keyof typeof updates]
      }
    })

    if (updates.total_area !== undefined && updates.total_area <= 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Total area must be greater than 0' 
      })
    }

    const farm = await FarmService.updateFarm(farmId, updates)
    res.json({ success: true, data: farm })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

// DELETE /api/farms/:id - Delete farm
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const farmerId = req.user?.id
    const farmId = req.params.id

    if (!farmerId) {
      return res.status(401).json({ success: false, error: 'User not authenticated' })
    }

    // Validate farm ownership
    const isOwner = await FarmService.validateFarmOwnership(farmId, farmerId)
    if (!isOwner) {
      return res.status(403).json({ success: false, error: 'Access denied to this farm' })
    }

    await FarmService.deleteFarm(farmId)
    res.json({ success: true, message: 'Farm deleted successfully' })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

// GET /api/farms/location/nearby - Find farms near coordinates
router.get('/location/nearby', async (req: Request, res: Response) => {
  try {
    const farmerId = req.user?.id
    if (!farmerId) {
      return res.status(401).json({ success: false, error: 'User not authenticated' })
    }

    const latitude = parseFloat(req.query.latitude as string)
    const longitude = parseFloat(req.query.longitude as string)
    const radius = parseFloat(req.query.radius as string) || 10 // default 10km radius
    
    // Validate coordinates
    if (isNaN(latitude) || latitude < -90 || latitude > 90) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid latitude. Must be a number between -90 and 90' 
      })
    }
    
    if (isNaN(longitude) || longitude < -180 || longitude > 180) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid longitude. Must be a number between -180 and 180' 
      })
    }
    
    if (isNaN(radius) || radius <= 0 || radius > 100) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid radius. Must be a positive number less than 100km' 
      })
    }

    const farms = await FarmService.getFarmsByLocation(latitude, longitude, radius, farmerId)
    res.json({ success: true, data: farms })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

// GET /api/farms/:farmId/fields - Get all fields for a farm
router.get('/:farmId/fields', async (req: Request, res: Response) => {
  try {
    const farmerId = req.user?.id
    const farmId = req.params.farmId

    if (!farmerId) {
      return res.status(401).json({ success: false, error: 'User not authenticated' })
    }

    const isOwner = await FarmService.validateFarmOwnership(farmId, farmerId)
    if (!isOwner) {
      return res.status(403).json({ success: false, error: 'Access denied to this farm' })
    }

    const farm = await FarmService.getFarmById(farmId)
    const fields = farm?.location?.fields || []
    res.json({ success: true, data: fields })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

// POST /api/farms/:farmId/fields - Add a new field to a farm
router.post('/:farmId/fields', async (req: Request, res: Response) => {
  try {
    const farmerId = req.user?.id
    const farmId = req.params.farmId

    if (!farmerId) {
      return res.status(401).json({ success: false, error: 'User not authenticated' })
    }

    const isOwner = await FarmService.validateFarmOwnership(farmId, farmerId)
    if (!isOwner) {
      return res.status(403).json({ success: false, error: 'Access denied to this farm' })
    }

    const { name, area_acres, area_hectares, polygon, center_latitude, center_longitude } = req.body

    if (!name || !area_acres || !polygon) {
      return res.status(400).json({ 
        success: false, 
        error: 'Field name, area, and polygon coordinates are required' 
      })
    }

    const farm = await FarmService.getFarmById(farmId)
    const currentLocation = farm?.location || {}
    const currentFields = currentLocation.fields || []

    const newField = {
      id: crypto.randomUUID(),
      name,
      area_acres,
      area_hectares: area_hectares || null,
      polygon,
      center_latitude: center_latitude || null,
      center_longitude: center_longitude || null,
      created_at: new Date().toISOString()
    }

    const updatedFields = [...currentFields, newField]
    const totalFieldArea = updatedFields.reduce((sum: number, f: any) => sum + parseFloat(f.area_acres), 0)

    await FarmService.updateFarm(farmId, {
      location: {
        ...currentLocation,
        fields: updatedFields
      },
      total_area: totalFieldArea
    })

    res.status(201).json({ success: true, data: newField })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

// DELETE /api/farms/:farmId/fields/:fieldId - Delete a field
router.delete('/:farmId/fields/:fieldId', async (req: Request, res: Response) => {
  try {
    const farmerId = req.user?.id
    const farmId = req.params.farmId
    const fieldId = req.params.fieldId

    if (!farmerId) {
      return res.status(401).json({ success: false, error: 'User not authenticated' })
    }

    const isOwner = await FarmService.validateFarmOwnership(farmId, farmerId)
    if (!isOwner) {
      return res.status(403).json({ success: false, error: 'Access denied to this farm' })
    }

    const farm = await FarmService.getFarmById(farmId)
    const currentLocation = farm?.location || {}
    const currentFields = currentLocation.fields || []

    const updatedFields = currentFields.filter((f: any) => f.id !== fieldId)
    const totalFieldArea = updatedFields.reduce((sum: number, f: any) => sum + parseFloat(f.area_acres), 0)

    await FarmService.updateFarm(farmId, {
      location: {
        ...currentLocation,
        fields: updatedFields
      },
      total_area: totalFieldArea || farm?.total_area || 0
    })

    res.json({ success: true, message: 'Field deleted successfully' })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

export default router