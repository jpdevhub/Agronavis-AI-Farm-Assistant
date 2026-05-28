import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabase';
import { farmApi, profileApi } from '../../utils/farmApi';

/**
 * OAuth Callback Page
 *
 * Supabase PKCE flow redirects here after Google OAuth.
 * This page exchanges the auth code for a valid session,
 * then checks whether the user has a farmer profile and routes accordingly.
 */
export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    // Handle the OAuth code exchange
    const handleCallback = async () => {
      try {
        // exchangeCodeForSession processes the ?code= param in the URL
        // This is what actually establishes the authenticated session client-side
        const { data, error } = await supabase.auth.exchangeCodeForSession(
          window.location.href
        );

        if (error) {
          console.error('Auth callback error:', error);
          router.replace('/auth/login?error=callback_failed');
          return;
        }

        const user = data?.session?.user;
        if (!user) {
          router.replace('/auth/login');
          return;
        }

        try {
          // Check if the user already has a farmer profile via backend API
          const profileResponse = await profileApi.getProfile();

          if (profileResponse.onboarding || !profileResponse.data) {
            // New user — go through onboarding
            router.replace('/onboarding/profile');
            return;
          }

          // Profile exists — check if a farm is set up
          const farms = await farmApi.getFarms();

          if (farms && farms.length > 0) {
            router.replace('/dashboard');
          } else {
            router.replace('/onboarding/farm');
          }
        } catch (err) {
          console.error('Error checking farmer profile or farms:', err);
          // Fallback to profile onboarding
          router.replace('/onboarding/profile');
        }
      } catch (err) {
        console.error('Unexpected callback error:', err);
        router.replace('/auth/login?error=unexpected');
      }
    };

    handleCallback();
  }, [router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500 mx-auto mb-4" />
        <p className="text-gray-600 font-medium">Signing you in…</p>
        <p className="text-gray-400 text-sm mt-1">Please wait a moment</p>
      </div>
    </div>
  );
}
