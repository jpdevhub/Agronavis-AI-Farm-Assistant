import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

// Route modules
import farmRoutes from './routes/farms';
import cropRoutes from './routes/crops';
import resourceRoutes from './routes/resources';
import soilHealthRoutes from './routes/soilHealth';
import yieldRoutes from './routes/yields';
import soilEstimationRoutes from './routes/soilEstimation';
import profileRoutes from './routes/profile';

// Auth middleware
import { authenticateSupabase } from './middleware/supabaseAuth';

const app = express();
const PORT = process.env.PORT || 3001;

// ─── Middleware ───────────────────────────────────────────────────────────────
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3000').split(',');

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow server-to-server requests (no origin) and listed origins
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS: Origin ${origin} not allowed`));
      }
    },
    credentials: true,
  })
);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── Public routes (no auth) ──────────────────────────────────────────────────
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'agronavis-api',
    version: '1.0.0',
  });
});

// Crop varieties for dropdowns — public, no auth needed
app.get('/api/crop-varieties', async (_req: Request, res: Response) => {
  try {
    const { supabase } = await import('./lib/supabase');
    const { data, error } = await supabase
      .from('crop_varieties')
      .select('*')
      .order('crop_type', { ascending: true });

    if (error) throw error;
    res.json({ success: true, data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

// ─── Authenticated API routes ─────────────────────────────────────────────────
// All data routes are protected — the Supabase JWT from the frontend is validated here.
app.use('/api/profile', authenticateSupabase, profileRoutes);
app.use('/api/farms', authenticateSupabase, farmRoutes);
app.use('/api/crops', authenticateSupabase, cropRoutes);
app.use('/api/resources', authenticateSupabase, resourceRoutes);
app.use('/api/soil-health', authenticateSupabase, soilHealthRoutes);
app.use('/api/yields', authenticateSupabase, yieldRoutes);
app.use('/api/soil-estimation', authenticateSupabase, soilEstimationRoutes);

// ─── Error handling ───────────────────────────────────────────────────────────
app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const message = error instanceof Error ? error.message : 'Internal server error';
  console.error('API Error:', error);
  res.status(500).json({
    success: false,
    error: message,
    timestamp: new Date().toISOString(),
  });
});

// 404 handler
app.use('*', (req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.originalUrl,
  });
});

// ─── Start server ─────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🚀 AgroNavis API running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/health`);
  console.log(`📚 API Base: http://localhost:${PORT}/api`);
  console.log(`🌿 Environment: ${process.env.NODE_ENV || 'development'}`);
});

export default app;