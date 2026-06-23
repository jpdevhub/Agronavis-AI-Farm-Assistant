import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { signInWithGoogle, signInWithPassword } from '../../lib/supabase'
import { useAuth } from '../../auth/context/AuthContext'
import { farmApi, profileApi } from '../../utils/farmApi'
import styles from '../../styles/Login.module.css'

// DEV credentials — read from .env.local, NOT present in production builds
// The entire button is gated by NODE_ENV === 'development' so it tree-shakes out
const DEV_EMAIL    = process.env.NEXT_PUBLIC_DEV_EMAIL    ?? ''
const DEV_PASSWORD = process.env.NEXT_PUBLIC_DEV_PASSWORD ?? ''

export default function Login() {
  const [loading, setLoading] = useState(false)
  const [devLoading, setDevLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const { user } = useAuth()

  // Redirect already-authenticated users
  useEffect(() => {
    async function checkUserProfile() {
      if (!user) return
      try {
        const profileResponse = await profileApi.getProfile()
        if (profileResponse.onboarding || !profileResponse.data) {
          router.push('/onboarding/profile')
          return
        }
        const farms = await farmApi.getFarms()
        router.push(farms && farms.length > 0 ? '/dashboard' : '/onboarding/farm')
      } catch {
        router.push('/onboarding/profile')
      }
    }
    checkUserProfile()
  }, [user, router])

  const handleGoogleSignIn = async () => {
    setLoading(true)
    setError('')
    try {
      const { error } = await signInWithGoogle()
      if (error) setError((error as any)?.message || 'An error occurred during sign in')
    } catch {
      setError('Failed to sign in with Google. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  /** ONE-CLICK dev login — uses the pre-created local user, zero emails */
  const handleDevLogin = async () => {
    setDevLoading(true)
    setError('')
    try {
      const { error } = await signInWithPassword(DEV_EMAIL, DEV_PASSWORD)
      if (error) throw error
      // Auth context will pick up the session and the useEffect above will redirect
    } catch (err: any) {
      setError(err.message || 'Dev login failed — is local Supabase running?')
    } finally {
      setDevLoading(false)
    }
  }

  return (
    <div className={styles.page}>
      {/* Full-bleed farm background */}
      <img
        src="/images/loginScreen.png"
        alt="Farm background"
        className={styles.bgImage}
      />
      {/* Soft overlay */}
      <div className={styles.bgOverlay} />

      {/* Centered login card */}
      <div className={styles.card} data-hc-target="true">
        {/* Logo */}
        <img
          src="/images/AgronavisLogo.png"
          alt="AgroNavis"
          className={styles.logo}
        />

        <h1 className={styles.title}>Welcome to AgroNavis</h1>
        <p className={styles.subtitle}>Sign in with your Google account to continue</p>

        {/* Error */}
        {error && <div className={styles.errorBox}>{error}</div>}

        {/* Google Sign In */}
        <button
          id="btn-google-signin"
          onClick={handleGoogleSignIn}
          disabled={loading || devLoading}
          className={styles.googleBtn}
        >
          {loading ? (
            <div className={styles.spinner} />
          ) : (
            <svg data-semantic="true" className={styles.googleIcon} viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
          )}
          {loading ? 'Signing in…' : 'Continue with Google'}
        </button>

        {/* Feature highlights */}
        <div className={styles.features}>
          <p className={styles.featuresLabel}>Access your farm management tools</p>
          <div className={styles.featurePills}>
            <span className={styles.featurePill}>🌱 Crop Monitoring</span>
            <span className={styles.featurePill}>📊 Analytics</span>
            <span className={styles.featurePill}>🌦️ Weather</span>
          </div>
        </div>

        {/*
         * ── DEV BYPASS ──────────────────────────────────────────────────────
         * ONLY rendered in development. Next.js statically replaces
         * process.env.NODE_ENV so this entire block is dead code in production
         * and gets tree-shaken out of the bundle. No credentials leak.
         * ─────────────────────────────────────────────────────────────────── */}
        {process.env.NODE_ENV === 'development' && (
          <div className={styles.devBypass}>
            <div className={styles.devBypassDivider}>
              <span>local dev only</span>
            </div>
            <button
              id="btn-dev-login"
              onClick={handleDevLogin}
              disabled={devLoading || loading}
              className={styles.devBypassBtn}
            >
              {devLoading ? (
                <span className={styles.devSpinner} />
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
              )}
              {devLoading ? 'Entering…' : 'Enter as Developer'}
            </button>
            <p className={styles.devBypassNote}>
              Pre-built account · No email · Not in production
            </p>
          </div>
        )}
      </div>
    </div>
  )
}