import { createClient } from '@supabase/supabase-js'

// Supabase project credentials
const supabaseUrl = 'https://iqabbojtfvzlxdbclthc.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlxYWJib2p0ZnZ6bHhkYmNsdGhjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQxMDA4OTEsImV4cCI6MjA3OTY3Njg5MX0.X553NraNoLJtSxNIrb-mARTqlxFqs3MMLmcLOXzOhK0'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Helper function to get current user
export const getCurrentUser = async () => {
  const { data: { user } } = await supabase.auth.getUser()
  return user
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

// Authentication helpers
export const signInWithEmail = async (email, password) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  })
  return { data, error }
}

// Helper function to bypass email confirmation for local development
export const signUpWithoutConfirmation = async (email, password) => {
  try {
    // First, create the user
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: {
          email_confirmed: true // Custom flag
        }
      }
    })

    if (signUpError && !signUpError.message.includes('already registered')) {
      return { data: signUpData, error: signUpError }
    }

    // Try to sign in immediately (this may work for some configurations)
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (!signInError && signInData.user) {
      return { data: signInData, error: null }
    }

    // If sign in fails, return the original signup result
    return { data: signUpData, error: signUpError }
  } catch (error) {
    return { data: null, error }
  }
}

export const signUpWithEmail = async (email, password) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: window.location.origin,
      data: {
        skip_email_verification: true
      }
      // Remove noEmailCode as it's not a valid option
    }
  })
  
  // If signup is successful but requires email confirmation, try to sign in immediately
  if (!error && data.user && !data.session) {
    // User created but not confirmed, try to confirm and sign in
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password
    })
    
    if (!signInError && signInData.user) {
      return { data: signInData, error: null }
    } else if (signInError) {
      // If sign in fails, return the original signup data
      return { data, error: signInError }
    }
  }
  
  return { data, error }
}

export const updateUser = async (updates) => {
  const { data, error } = await supabase.auth.updateUser(updates)
  return { data, error }
}

export const signOut = async () => {
  const { error } = await supabase.auth.signOut()
  return { error }
}

// Listen to auth changes
export const onAuthStateChange = (callback) => {
  return supabase.auth.onAuthStateChange(callback)
}
