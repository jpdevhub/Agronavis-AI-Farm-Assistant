import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../../lib/supabase'

interface ProtectedRouteProps {
  children: React.ReactNode
  redirectTo?: string
  requireOnboarding?: boolean
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  redirectTo = '/auth/login',
  requireOnboarding = true
}) => {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [checkingOnboarding, setCheckingOnboarding] = useState(true)
  const currentPath = router.pathname

  useEffect(() => {
    async function checkOnboarding() {
      setCheckingOnboarding(true)
      if (!user) return;
      
      // Skip onboarding check for onboarding pages themselves
      if (currentPath.startsWith('/onboarding/')) {
        setCheckingOnboarding(false)
        return;
      }

      // Check if user has completed profile setup
      const { data: farmerProfile, error } = await supabase
        .from('farmers')
        .select('id')
        .eq('id', user.id)
        .single();
        
      if (error && error.code !== 'PGRST116') { // PGRST116 is "not found" error
        console.error('Error checking profile:', error);
        setCheckingOnboarding(false)
        return;
      }
        
      if (!farmerProfile && requireOnboarding) {
        // User needs to complete profile setup
        router.push('/onboarding/profile');
        return;
      }
      
      // Check if user has completed farm setup
      const { data: farms, error: farmError } = await supabase
        .from('farms')
        .select('id')
        .eq('farmer_id', user.id)
        .limit(1);
        
      if (farmError) {
        console.error('Error checking farm:', farmError);
      }
      
      if ((!farms || farms.length === 0) && requireOnboarding) {
        // User needs to set up a farm
        router.push('/onboarding/farm');
        return;
      }
      
      setCheckingOnboarding(false)
    }

    if (!loading) {
      if (!user) {
        router.push(redirectTo)
      } else {
        checkOnboarding()
      }
    }
  }, [user, loading, router, redirectTo, requireOnboarding, currentPath])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return <>{children}</>
}

export default ProtectedRoute