/**
 * API Testing Script for Band Sync Calendar
 * 
 * Simple test script to verify API endpoints work correctly.
 * Run this after deploying the worker to test functionality.
 */

// Configuration
const API_BASE_URL = 'https://band-sync-calendar-production.cooooookai.workers.dev';

/**
 * Test helper function
 */
async function testEndpoint(name, url, options = {}) {
  console.log(`\n🧪 Testing: ${name}`);
  console.log(`📡 ${options.method || 'GET'} ${url}`);
  
  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    });
    
    const data = await response.json();
    
    if (response.ok) {
      console.log(`✅ Success (${response.status}):`, data);
    } else {
      console.log(`❌ Error (${response.status}):`, data);
    }
    
    return { success: response.ok, data, status: response.status };
  } catch (error) {
    console.log(`💥 Network Error:`, error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Run all API tests
 */
async function runTests() {
  console.log('🚀 Starting Band Sync Calendar API Tests');
  console.log(`🌐 Base URL: ${API_BASE_URL}`);
  
  // Test 1: API Info
  await testEndpoint('API Info', `${API_BASE_URL}/`);
  
  // Test 2: Get Events (empty)
  const now = new Date().toISOString();
  const future = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(); // +60 days
  await testEndpoint(
    'Get Events (empty)', 
    `${API_BASE_URL}/events?start=${now}&end=${future}`
  );
  
  // Test 3: Create Event
  const eventData = {
    title: '下北沢LIVE',
    type: 'live',
    start_time: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // +7 days
    end_time: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000).toISOString(), // +3 hours
    created_by: 'テスト太郎'
  };
  
  await testEndpoint('Create Event', `${API_BASE_URL}/events`, {
    method: 'POST',
    body: JSON.stringify(eventData)
  });
  
  // Test 4: Get Events (with data)
  await testEndpoint(
    'Get Events (with data)', 
    `${API_BASE_URL}/events?start=${now}&end=${future}`
  );
  
  // Test 5: Get Availability (empty)
  await testEndpoint(
    'Get Availability (empty)', 
    `${API_BASE_URL}/availability?start=${now}&end=${future}`
  );
  
  // Test 6: Create Availability
  const availabilityData = {
    member_name: 'テスト太郎',
    start_time: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // +7 days
    end_time: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000).toISOString(), // +4 hours
    status: 'good'
  };
  
  await testEndpoint('Create Availability', `${API_BASE_URL}/availability`, {
    method: 'POST',
    body: JSON.stringify(availabilityData)
  });
  
  // Test 7: Get Availability (with data)
  await testEndpoint(
    'Get Availability (with data)', 
    `${API_BASE_URL}/availability?start=${now}&end=${future}`
  );
  
  // Test 8: Upsert Availability (update existing)
  const updatedAvailabilityData = {
    ...availabilityData,
    status: 'ok' // Change status
  };
  
  await testEndpoint('Upsert Availability', `${API_BASE_URL}/availability`, {
    method: 'POST',
    body: JSON.stringify(updatedAvailabilityData)
  });
  
  // Test 9: Error Cases
  await testEndpoint('Invalid Event Type', `${API_BASE_URL}/events`, {
    method: 'POST',
    body: JSON.stringify({
      ...eventData,
      type: 'invalid'
    })
  });
  
  await testEndpoint('Invalid Time Range', `${API_BASE_URL}/events`, {
    method: 'POST',
    body: JSON.stringify({
      ...eventData,
      start_time: eventData.end_time,
      end_time: eventData.start_time
    })
  });
  
  console.log('\n🏁 Tests completed!');
}

// Run tests if this file is executed directly
if (typeof window === 'undefined') {
  runTests().catch(console.error);
}

export { runTests, testEndpoint };