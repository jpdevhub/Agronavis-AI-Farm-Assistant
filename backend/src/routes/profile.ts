/**
 * Profile Routes — /api/profile
 *
 * Handles the farmer's own profile data.
 * Auth is enforced upstream in app.ts via authenticateSupabase middleware.
 *
 * Future: These operations can be migrated to a Supabase Edge Function
 * (`supabase/functions/profile/index.ts`) for a fully serverless approach.
 */

import { Router, Request, Response } from 'express';
import { supabase } from '../lib/supabase';

const router = Router();

/**
 * GET /api/profile
 * Returns the authenticated user's farmer profile.
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = (req as Request & { user: { id: string } }).user.id;

    const { data, error } = await supabase
      .from('farmers')
      .select('*')
      .eq('id', userId)
      .single();

    if (error && error.code === 'PGRST116') {
      // Profile not yet created — return empty object so the frontend knows to onboard
      return res.json({ success: true, data: null, onboarding: true });
    }

    if (error) throw error;

    res.json({ success: true, data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to get profile';
    console.error('Get profile error:', error);
    res.status(500).json({ success: false, error: message });
  }
});

/**
 * POST /api/profile
 * Creates or updates the authenticated user's farmer profile (upsert).
 * Body: { full_name, phone_number, gender?, date_of_birth?, years_of_experience?, education_level? }
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const userId = (req as Request & { user: { id: string } }).user.id;

    const {
      full_name,
      phone_number,
      gender,
      date_of_birth,
      years_of_experience,
      education_level,
    } = req.body;

    if (!full_name || !phone_number) {
      return res.status(400).json({
        success: false,
        error: 'full_name and phone_number are required',
      });
    }

    const profilePayload = {
      id: userId,
      full_name,
      phone_number,
      gender: gender || null,
      date_of_birth: date_of_birth || null,
      years_of_experience: years_of_experience ? Number(years_of_experience) : null,
      education_level: education_level || null,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('farmers')
      .upsert(profilePayload, { onConflict: 'id' })
      .select()
      .single();

    if (error) throw error;

    res.json({ success: true, data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to save profile';
    console.error('Save profile error:', error);
    res.status(500).json({ success: false, error: message });
  }
});

export default router;
