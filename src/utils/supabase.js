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

// Simple local authentication bypass
export const signInWithEmail = async (email, password) => {
  // For local development, just check if the user exists in localStorage
  try {
    const username = email.split('@')[0]
    const storedUsers = JSON.parse(localStorage.getItem('local_users') || '{}')
    
    if (storedUsers[username] && storedUsers[username].password === password) {
      return { 
        data: { 
          user: {
            id: `local_${username}`,
            email: email,
            username: username,
            aud: 'authenticated',
            role: 'authenticated'
          },
          session: {
            user: {
              id: `local_${username}`,
              email: email,
              username: username
            }
          }
        }, 
        error: null 
      }
    } else {
      return { 
        data: null, 
        error: { message: 'Invalid username or password' } 
      }
    }
  } catch (error) {
    return { 
      data: null, 
      error: { message: 'Authentication failed' } 
    }
  }
}

// Helper function to bypass email confirmation for local development
export const signUpWithoutConfirmation = async (email, password) => {
  try {
    const username = email.split('@')[0]
    const storedUsers = JSON.parse(localStorage.getItem('local_users') || '{}')
    
    // Check if user already exists
    if (storedUsers[username]) {
      // User exists, try to sign them in
      return await signInWithEmail(email, password)
    }
    
    // Create new user in localStorage
    storedUsers[username] = {
      username: username,
      email: email,
      password: password,
      created_at: new Date().toISOString()
    }
    
    localStorage.setItem('local_users', JSON.stringify(storedUsers))
    
    return { 
      data: { 
        user: {
          id: `local_${username}`,
          email: email,
          username: username,
          aud: 'authenticated',
          role: 'authenticated'
        },
        session: {
          user: {
            id: `local_${username}`,
            email: email,
            username: username
          }
        }
      }, 
      error: null 
    }
  } catch (error) {
    return { 
      data: null, 
      error: { message: 'Failed to create account' } 
    }
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
