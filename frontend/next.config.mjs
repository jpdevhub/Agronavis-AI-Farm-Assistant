/** @type {import('next').NextConfig} */
import dotenv from 'dotenv';
import path from 'path';
import withPWAInit from '@ducanh2912/next-pwa';

// Load root .env (single source of truth for all env vars)
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });

const withPWA = withPWAInit({
  dest: 'public',
  sw: 'sw.js',
  disable: process.env.NODE_ENV === 'development', // no SW in dev — avoids caching confusion
  register: true,
  skipWaiting: true,
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  workboxOptions: {
    disableDevLogs: true,
    // Runtime caching rules - these are added to the auto-generated Workbox SW
    // They tell the SW how to handle specific request types at runtime
    runtimeCaching: [
      {
        // Cache ONNX and WASM static assets (models and runtimes) for offline execution
        urlPattern: ({ url }) => url.pathname.endsWith('.onnx') || url.pathname.endsWith('.wasm'),
        handler: 'CacheFirst',
        options: {
          cacheName: 'agronavis-ml-assets-v1',
          expiration: {
            maxEntries: 10,
            maxAgeSeconds: 30 * 24 * 60 * 60, // Cache for 30 days
          },
          cacheableResponse: {
            statuses: [0, 200],
          },
        },
      },
      {
        // Cache API responses for farms and crop-scans
        // Use matchCallback: Workbox tests RegExp against full URL, not just pathname
        urlPattern: ({ url }) => url.pathname.startsWith('/api/farms'),
        // Strategy: CacheFirst = check cache first, fall back to network
        handler: 'CacheFirst',
        options: {
          cacheName: 'agronavis-api-farms',
          expiration: {
            maxEntries: 50, // Keep at most 50 cached responses
            maxAgeSeconds: 24 * 60 * 60, // Cache for 24 hours
          },
          cacheableResponse: {
            statuses: [0, 200], // Cache opaque responses (from SW) and 200 OK
          },
        },
      },
      {
        // Cache API responses for crop scans
        urlPattern: ({ url }) => url.pathname.startsWith('/api/crop-scans'),
        handler: 'CacheFirst',
        options: {
          cacheName: 'agronavis-api-scans',
          expiration: {
            maxEntries: 100,
            maxAgeSeconds: 24 * 60 * 60,
          },
          cacheableResponse: {
            statuses: [0, 200],
          },
        },
      },
      {
        // Cache all other API GET requests with NetworkFirst strategy
        // Why: Other APIs should try network first, use cache as fallback
        urlPattern: ({ url }) => url.pathname.startsWith('/api/'),
        handler: 'NetworkFirst',
        options: {
          cacheName: 'agronavis-api-other',
          networkTimeoutSeconds: 5, // Wait 5 seconds for network before using cache
          expiration: {
            maxEntries: 30,
            maxAgeSeconds: 24 * 60 * 60,
          },
          cacheableResponse: {
            statuses: [0, 200],
          },
        },
      },
    ],
  },
});

const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
      },
    ],
    formats: ['image/webp', 'image/avif'],
  },
  transpilePackages: ['react-leaflet', 'leaflet', 'onnxruntime-web'],
  experimental: {
    optimizePackageImports: ['@supabase/supabase-js'],
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      'onnxruntime-web': path.resolve(process.cwd(), 'node_modules/onnxruntime-web/dist/ort.all.min.js'),
    };
    return config;
  },
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
    NEXT_PUBLIC_WEATHER_API_KEY: process.env.NEXT_PUBLIC_WEATHER_API_KEY,
  },
};

export default withPWA(nextConfig);
