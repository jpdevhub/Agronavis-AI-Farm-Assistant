/**
 * Supabase Auth Client — Frontend
 *
 * This is the ONLY Supabase usage in the frontend.
 * Purpose: Manage the user's auth session (OAuth, JWT token, sign-out).
 *
 * ❌ Do NOT add supabase.from() data queries here.
 *    All data operations go through the Python FastAPI backend (see utils/farmApi.ts).
 *
 * Architecture: Frontend (auth session only) → Python FastAPI Backend → Supabase DB
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key-for-build';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
  },
});

/** Trigger Google OAuth login — redirects to /auth/callback */
export const signInWithGoogle = async () => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
  });

  if (error) {
    console.error('Google sign-in error:', error);
  }

  return { data, error };
};

/** Sign out the current user and clear all cached data */
export const signOut = async () => {
  // Clear Workbox runtime caches (API responses)
  if ('caches' in window) {
    try {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames
          .filter(name => name.startsWith('agronavis-'))
          .map(name => caches.delete(name))
      );
    } catch (e) {
      console.warn('Failed to clear caches:', e);
    }
  }

  // Clear IndexedDB offline store (farm data, scans, fields)
  if ('indexedDB' in window) {
    try {
      indexedDB.deleteDatabase('agronavis-offline-db');
    } catch (e) {
      console.warn('Failed to clear IndexedDB:', e);
    }
  }

  const { error } = await supabase.auth.signOut();
  return { error };
};

/** Get the current authenticated user */
export const getCurrentUser = () => supabase.auth.getUser();

/** Get the current session (includes JWT access_token) */
export const getCurrentSession = () => supabase.auth.getSession();

/**
 * Dev login: sign in with email + password.
 * No emails sent — instant login. Works offline, no Mailpit needed.
 */
export const signInWithPassword = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  return { data, error };
};

/**
 * Dev signup: create account with email + password.
 * enable_confirmations = false in config.toml → auto-confirmed instantly.
 * No emails sent.
 */
export const signUpWithPassword = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
  });
  return { data, error };
};

/**
 * @deprecated Use signInWithPassword for local dev instead.
 * Magic link sends an email → hits Mailpit rate limit after 2–3 uses.
 */
export const signInWithEmail = async (email: string) => {
  const { data, error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${window.location.origin}/auth/callback`,
      shouldCreateUser: true,
    },
  });
  return { data, error };
};