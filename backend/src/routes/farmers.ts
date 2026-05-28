import express, { Request, Response } from 'express';
import { FarmerService } from '../services/farmerService';

const router = express.Router();


// GET /api/farmers - Get current farmer profile
router.get('/', async (req: Request, res: Response) => {
  try {
    const farmerId = req.user?.id
    if (!farmerId) {
      return res.status(401).json({ success: false, error: 'User not authenticated' })
    }

    const farmer = await FarmerService.getFarmerById(farmerId)
    if (!farmer) {
      return res.status(404).json({ success: false, error: 'Farmer profile not found' })
    }

    res.json({ success: true, data: farmer })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

// POST /api/farmers - Create farmer profile
router.post('/', async (req: Request, res: Response) => {
  try {
    const farmerId = req.user?.id
    if (!farmerId) {
      return res.status(401).json({ success: false, error: 'User not authenticated' })
    }

    // Check if farmer already exists
    const existingFarmer = await FarmerService.getFarmerById(farmerId)
    if (existingFarmer) {
      return res.status(400).json({ success: false, error: 'Farmer profile already exists' })
    }

    const farmerData = {
      id: farmerId,
      full_name: req.body.full_name,
      phone_number: req.body.phone_number,
      date_of_birth: req.body.date_of_birth,
      gender: req.body.gender,
      education_level: req.body.education_level,
      years_of_experience: req.body.years_of_experience
    }

    // Validate required fields
    if (!farmerData.full_name || !farmerData.phone_number) {
      return res.status(400).json({ 
        success: false, 
        error: 'Full name and phone number are required' 
      })
    }

    const farmer = await FarmerService.createFarmer(farmerData)
    res.status(201).json({ success: true, data: farmer })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

// PUT /api/farmers - Update farmer profile
router.put('/', async (req: Request, res: Response) => {
  try {
    const farmerId = req.user?.id
    if (!farmerId) {
      return res.status(401).json({ success: false, error: 'User not authenticated' })
    }

    const updates = {
      full_name: req.body.full_name,
      phone_number: req.body.phone_number,
      date_of_birth: req.body.date_of_birth,
      gender: req.body.gender,
      education_level: req.body.education_level,
      years_of_experience: req.body.years_of_experience
    }

    // Remove undefined fields
    Object.keys(updates).forEach(key => {
      if (updates[key as keyof typeof updates] === undefined) {
        delete updates[key as keyof typeof updates]
      }
    })

    const farmer = await FarmerService.updateFarmer(farmerId, updates)
    res.json({ success: true, data: farmer })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

// DELETE /api/farmers - Delete farmer profile (and all related data)
router.delete('/', async (req: Request, res: Response) => {
  try {
    const farmerId = req.user?.id
    if (!farmerId) {
      return res.status(401).json({ success: false, error: 'User not authenticated' })
    }

    await FarmerService.deleteFarmer(farmerId)
    res.json({ success: true, message: 'Farmer profile deleted successfully' })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

// GET /api/farmers/exists - Check if farmer profile exists
router.get('/exists', async (req: Request, res: Response) => {
  try {
    const farmerId = req.user?.id
    if (!farmerId) {
      return res.status(401).json({ success: false, error: 'User not authenticated' })
    }

    const exists = await FarmerService.farmerExists(farmerId)
    res.json({ success: true, exists })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

export default router