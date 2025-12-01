import { createClient } from '@supabase/supabase-js'

// Supabase project credentials
const supabaseUrl = 'https://iqabbojtfvzlxdbclthc.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlxYWJib2p0ZnZ6bHhkYmNsdGhjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQxMDA4OTEsImV4cCI6MjA3OTY3Njg5MX0.X553NraNoLJtSxNIrb-mARTqlxFqs3MMLmcLOXzOhK0'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Helper function to get current user - uses cached session for speed
export const getCurrentUser = async () => {
  // Use getSession() first - it returns cached session without network request
  const { data: { session } } = await supabase.auth.getSession()
  return session?.user || null
}

// Helper function to ensure user profile exists
export const ensureUserProfile = async (user) => {
  if (!user) return null

  // Check if profile exists
  const { data: profile, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (error && error.code === 'PGRST116') {
    // Profile doesn't exist, create it
    const { data: newProfile, error: insertError } = await supabase
      .from('user_profiles')
      .insert({
        id: user.id,
        username: user.email || `user_${user.id.slice(0, 8)}`
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error creating user profile:', insertError)
      return null
    }
    return newProfile
  }

  return profile
}

// Sign in with Supabase auth
export const signInWithEmail = async (email, password) => {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })
    
    if (error) {
      console.error('Supabase sign in error:', error)
      return { data: null, error }
    }
    
    return { data, error: null }
  } catch (error) {
    console.error('Sign in error:', error)
    return { 
      data: null, 
      error: { message: 'Authentication failed' } 
    }
  }
}

// Sign up with Supabase auth (with auto-confirm for development)
export const signUpWithoutConfirmation = async (email, password) => {
  try {
    // First try to sign up
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin
      }
    })
    
    if (signUpError) {
      // If user already exists, try to sign in
      if (signUpError.message.includes('already registered')) {
        return await signInWithEmail(email, password)
      }
      console.error('Supabase sign up error:', signUpError)
      return { data: null, error: signUpError }
    }
    
    // If signup succeeded but no session (email confirmation required),
    // try to sign in anyway (works if email confirmation is disabled in Supabase)
    if (signUpData.user && !signUpData.session) {
      const signInResult = await signInWithEmail(email, password)
      if (signInResult.data?.session) {
        return signInResult
      }
      // Return signup data if sign in didn't work
      return { data: signUpData, error: null }
    }
    
    return { data: signUpData, error: null }
  } catch (error) {
    console.error('Sign up error:', error)
    return { 
      data: null, 
      error: { message: 'Failed to create account' } 
    }
  }
}

export const updateUser = async (updates) => {
  const { data, error } = await supabase.auth.updateUser(updates)
  return { data, error }
}

export const signOut = async () => {
  // Clear user ID cache from cloudDataV2
  try {
    const { clearUserIdCache } = await import('./cloudDataV2')
    clearUserIdCache()
  } catch (e) {
    // Ignore if cloudDataV2 not available
  }
  
  const { error } = await supabase.auth.signOut()
  return { error }
}

// Listen to auth changes
export const onAuthStateChange = (callback) => {
  return supabase.auth.onAuthStateChange(callback)
}
