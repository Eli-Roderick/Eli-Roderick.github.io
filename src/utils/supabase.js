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

export const signUpWithEmail = async (email, password) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: window.location.origin,
      data: {
        skip_email_verification: true
      },
      // Disable email confirmation for local development
      noEmailCode: true
    }
  })
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
