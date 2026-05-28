/**
 * Supabase JWT Authentication Middleware
 *
 * Validates the Bearer token sent by the frontend (Supabase session JWT).
 * On success, attaches `req.user` so route handlers can access the user's ID.
 *
 * All protected routes in app.ts use this middleware.
 */

import { Request, Response, NextFunction } from 'express';
import { supabase } from '../lib/supabase';

export const authenticateSupabase = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ success: false, error: 'Authentication required' });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data.user) {
      res.status(401).json({ success: false, error: 'Invalid or expired token' });
      return;
    }

    // Attach user to request — available to all downstream route handlers
    req.user = {
      id: data.user.id,
      email: data.user.email,
    };

    next();
  } catch (err) {
    console.error('Auth middleware error:', err);
    res.status(401).json({ success: false, error: 'Authentication failed' });
  }
};