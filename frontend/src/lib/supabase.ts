/**
 * Supabase Auth Client — Frontend
 *
 * This is the ONLY Supabase usage in the frontend.
 * Purpose: Manage the user's auth session (OAuth, JWT token, sign-out).
 *
 * ❌ Do NOT add supabase.from() data queries here.
 *    All data operations go through the Express backend (see utils/farmApi.ts).
 *
 * Architecture: Frontend (auth session only) → Express Backend → Supabase DB
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

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

/** Sign out the current user */
export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  return { error };
};

/** Get the current authenticated user */
export const getCurrentUser = () => supabase.auth.getUser();

/** Get the current session (includes JWT access_token) */
export const getCurrentSession = () => supabase.auth.getSession();

/**
 * Sign in / sign up with email (magic link / OTP).
 * Used for local development testing — Supabase will send a magic link to Mailpit.
 * Access Mailpit at http://127.0.0.1:54324 to click the link.
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