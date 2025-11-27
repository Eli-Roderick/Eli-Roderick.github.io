// Test script to check if Supabase sync is working
import { supabase } from './src/utils/supabase.js'

async function testSync() {
  console.log('🧪 Testing Supabase connection...')
  
  try {
    // Test basic connection
    const { data, error } = await supabase
      .from('custom_search_pages')
      .select('count', { count: 'exact' })
    
    if (error) {
      console.error('❌ Database connection failed:', error)
      console.log('\n🔧 SOLUTION:')
      console.log('1. Go to your Supabase dashboard')
      console.log('2. Run the SQL in simple-username-schema.sql')
      console.log('3. This will create the correct tables for username-based sync')
      return
    }
    
    console.log('✅ Database connection successful!')
    console.log(`📊 Found ${data[0].count} custom search pages in database`)
    
    // Test inserting a simple record
    const testUsername = 'test_user_' + Date.now()
    const { error: insertError } = await supabase
      .from('custom_search_pages')
      .insert({
        username: testUsername,
        query_key: 'test_query',
        search_key: 'test-query',
        query: 'test query',
        display_name: 'Test Query'
      })
    
    if (insertError) {
      console.error('❌ Insert test failed:', insertError)
      return
    }
    
    console.log('✅ Insert test successful!')
    
    // Clean up test data
    await supabase
      .from('custom_search_pages')
      .delete()
      .eq('username', testUsername)
    
    console.log('✅ Sync system is working correctly!')
    
  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

testSync()
